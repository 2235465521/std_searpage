import pymysql

conn = pymysql.connect(
    host='127.0.0.1',
    user='root',
    password='lsj223546',
    database='mydate',
    charset='utf8mb4'
)

try:
    with conn.cursor() as cursor:
        print("Checking all tables for base_id = 6090 (GB/T 1.1-2020):")
        
        # List of tables that have base_id column
        tables = [
            'std_gb_detail', 'std_hb_detail', 'std_db_detail', 'std_tb_detail',
            'std_extend_h', 'std_extend_s', 'std_index', 'std_statistical',
            'std_pedigree', 'std_replace'
        ]
        
        for tbl in tables:
            cursor.execute(f"SELECT * FROM {tbl} WHERE base_id = 6090")
            rows = cursor.fetchall()
            if rows:
                print(f"\nTable {tbl}:")
                for r in rows:
                    print(r)
finally:
    conn.close()
