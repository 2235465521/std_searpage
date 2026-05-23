import threading

from django.apps import AppConfig


class StandardAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'standard_app'

    def ready(self):
        if not getattr(self, '_es_probe_started', False):
            StandardAppConfig._es_probe_started = True
            from .services import es_client
            from .es_circuit import probe_elasticsearch

            threading.Thread(
                target=probe_elasticsearch,
                args=(es_client,),
                daemon=True,
                name='es-probe',
            ).start()
