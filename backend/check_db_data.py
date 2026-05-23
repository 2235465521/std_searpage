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
        print("Table structure for std_replace:")
        cursor.execute("DESCRIBE std_replace")
        for col in cursor.fetchall():
            print(col)
            
        print("\nData for base_id=842164 in std_replace:")
        cursor.execute("SELECT * FROM std_replace WHERE base_id=842164")
        for row in cursor.fetchall():
            print(row)
            
        print("\nData for base_id=842164 in std_base:")
        cursor.execute("SELECT * FROM std_base WHERE id=842164")
        for row in cursor.fetchall():
            print(row)
finally:
    conn.close()
