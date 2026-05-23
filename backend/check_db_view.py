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
        cursor.execute("DESCRIBE view_std_full")
        columns = cursor.fetchall()
        for col in columns:
            print(col)
finally:
    conn.close()
