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
        cursor.execute("DESCRIBE std_gb_detail")
        for col in cursor.fetchall():
            print(col)
finally:
    conn.close()
