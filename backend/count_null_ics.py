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
        cursor.execute("SELECT COUNT(*) FROM std_gb_detail WHERE ics IS NULL OR ics = ''")
        print("GB details with NULL/empty ICS:", cursor.fetchone()[0])
        
        cursor.execute("SELECT COUNT(*) FROM std_gb_detail WHERE ccs IS NULL OR ccs = ''")
        print("GB details with NULL/empty CCS:", cursor.fetchone()[0])
finally:
    conn.close()
