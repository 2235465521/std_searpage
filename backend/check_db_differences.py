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
        print("Checking for discrepancies between view_std_full and detail tables:")
        
        # GB details
        cursor.execute("""
            SELECT COUNT(*) 
            FROM std_gb_detail d 
            JOIN view_std_full v ON d.base_id = v.id 
            WHERE d.ics != v.ics OR (d.ics IS NULL AND v.ics IS NOT NULL) OR (d.ics IS NOT NULL AND v.ics IS NULL)
               OR d.ccs != v.ccs OR (d.ccs IS NULL AND v.ccs IS NOT NULL) OR (d.ccs IS NOT NULL AND v.ccs IS NULL)
        """)
        print("GB discrepancy count:", cursor.fetchone()[0])
        
        # HB details
        cursor.execute("""
            SELECT COUNT(*) 
            FROM std_hb_detail d 
            JOIN view_std_full v ON d.base_id = v.id 
            WHERE d.ics != v.ics OR (d.ics IS NULL AND v.ics IS NOT NULL) OR (d.ics IS NOT NULL AND v.ics IS NULL)
               OR d.ccs != v.ccs OR (d.ccs IS NULL AND v.ccs IS NOT NULL) OR (d.ccs IS NOT NULL AND v.ccs IS NULL)
        """)
        print("HB discrepancy count:", cursor.fetchone()[0])
finally:
    conn.close()
