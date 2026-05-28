"""从 view_std_full 全量同步标准检索数据到 Elasticsearch。"""
from django.conf import settings
from django.core.management.base import BaseCommand
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

from standard_app.crud import SEARCH_LIST_FIELDS
from standard_app.models import ViewStdFull

INDEX_MAPPING = {
    'mappings': {
        'properties': {
            'id': {'type': 'long'},
            'std_id': {
                'type': 'text',
                'fields': {'keyword': {'type': 'keyword', 'ignore_above': 512}},
            },
            'std_type': {
                'type': 'text',
                'fields': {'keyword': {'type': 'keyword', 'ignore_above': 64}},
            },
            'std_type_no': {'type': 'keyword'},
            'std_chinesename': {'type': 'text'},
            'std_englishname': {'type': 'text'},
            'release_date': {'type': 'date', 'format': 'yyyy-MM-dd||strict_date_optional_time||epoch_millis'},
            'implement_date': {'type': 'date', 'format': 'yyyy-MM-dd||strict_date_optional_time||epoch_millis'},
            'ex_state': {'type': 'integer'},
            'create_time': {'type': 'date', 'format': 'strict_date_optional_time||epoch_millis'},
        },
    },
}


def _serialize_row(row):
    doc = {}
    for field in SEARCH_LIST_FIELDS:
        value = row.get(field)
        if value is None:
            doc[field] = None
            continue
        if hasattr(value, 'isoformat'):
            doc[field] = value.isoformat()
        else:
            doc[field] = value
    return doc


def _iter_actions(rows, index_name):
    for row in rows:
        doc = _serialize_row(row)
        doc_id = doc.get('id')
        yield {
            '_op_type': 'index',
            '_index': index_name,
            '_id': doc_id,
            '_source': doc,
        }


class Command(BaseCommand):
    help = 'Create Elasticsearch index and bulk sync view_std_full for standard search.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--recreate',
            action='store_true',
            help='Delete and recreate the index before syncing.',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=500,
            help='Bulk batch size (default: 500).',
        )

    def handle(self, *args, **options):
        if not getattr(settings, 'USE_ELASTICSEARCH', False):
            self.stdout.write(self.style.WARNING(
                'USE_ELASTICSEARCH is false. Sync will still run, but Django will not use ES until enabled.',
            ))

        host = getattr(settings, 'ES_HOST', 'http://127.0.0.1:9200')
        index_name = getattr(settings, 'ES_INDEX', 'standards')
        timeout = getattr(settings, 'ES_REQUEST_TIMEOUT', 2)
        batch_size = max(100, options['batch_size'])

        client = Elasticsearch(host, request_timeout=max(timeout, 30))
        if not client.ping():
            self.stderr.write(self.style.ERROR(f'Cannot reach Elasticsearch at {host}'))
            return

        if options['recreate'] and client.indices.exists(index=index_name):
            client.indices.delete(index=index_name)
            self.stdout.write(f'Deleted index: {index_name}')

        if not client.indices.exists(index=index_name):
            client.indices.create(index=index_name, mappings=INDEX_MAPPING['mappings'])
            self.stdout.write(f'Created index: {index_name}')

        qs = ViewStdFull.objects.all().values(*SEARCH_LIST_FIELDS)
        total = qs.count()
        self.stdout.write(f'Syncing {total} rows from view_std_full -> {index_name} ...')

        synced = 0
        batch = []
        for row in qs.iterator(chunk_size=batch_size):
            batch.append(row)
            if len(batch) >= batch_size:
                bulk(client, _iter_actions(batch, index_name), chunk_size=batch_size)
                synced += len(batch)
                self.stdout.write(f'  ... {synced}/{total}')
                batch = []

        if batch:
            bulk(client, _iter_actions(batch, index_name), chunk_size=batch_size)
            synced += len(batch)

        client.indices.refresh(index=index_name)
        es_count = client.count(index=index_name)['count']
        self.stdout.write(self.style.SUCCESS(
            f'Done. MySQL rows={total}, ES docs={es_count}, index={index_name}',
        ))
