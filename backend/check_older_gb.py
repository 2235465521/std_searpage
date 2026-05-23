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
        print("Checking older GB/T 1.1 editions:")
        cursor.execute("SELECT id, std_id FROM std_base WHERE std_id LIKE 'GB/T 1.1-%'")
        for base_id, std_id in cursor.fetchall():
            cursor.execute("SELECT ics, ccs FROM std_gb_detail WHERE base_id = %s", (base_id,))
            detail = cursor.fetchone()
            print(f"Base ID={base_id}, std_id={std_id}, detail={detail}")
finally:
    conn.close()
