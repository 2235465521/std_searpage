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
        cursor.execute("SELECT id, std_id, HEX(std_id) FROM std_base WHERE id = 165207")
        print(cursor.fetchall())
finally:
    conn.close()
