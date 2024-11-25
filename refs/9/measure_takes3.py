import psycopg2
import time
import statistics
import matplotlib.pyplot as plt

def measure_insert_time(cur, n, conn):
    times = []
    add_pk_times = []
    for _ in range(3):
        cur.execute("DROP TABLE IF EXISTS takes3")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS takes3 (
                ID			varchar(5), 
                course_id		varchar(8),
                sec_id			varchar(8), 
                semester		varchar(6),
                year			numeric(4,0),
                grade		        varchar(2),
                foreign key (course_id,sec_id, semester, year) references section
                    on delete cascade,
                foreign key (ID) references student
                    on delete cascade
            );
        """)
        conn.commit()
        start_time = time.time()
        cur.execute("INSERT INTO takes3 SELECT * FROM takes LIMIT %s", (n,))
        conn.commit()
        end_time = time.time()
        times.append((end_time - start_time) * 1000)  # Convert to milliseconds
        s = time.time()
        cur.execute("""
            ALTER TABLE takes3
            ADD CONSTRAINT takes3_pkey PRIMARY KEY (ID, course_id, sec_id, semester, year);
        """)
        conn.commit()
        e = time.time()
        add_pk_times.append((e - s) * 1000)
    return statistics.median(times), statistics.median(add_pk_times)

def measure_insert_with_pk_time(cur, n, conn):
    times = []
    for _ in range(3):
        cur.execute("DROP TABLE IF EXISTS takes2")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS takes2 (
                ID			varchar(5), 
                course_id		varchar(8),
                sec_id			varchar(8), 
                semester		varchar(6),
                year			numeric(4,0),
                grade		        varchar(2),
                PRIMARY KEY (ID, course_id, sec_id, semester, year),
                foreign key (course_id,sec_id, semester, year) references section
                    on delete cascade,
                foreign key (ID) references student
                    on delete cascade
            )
        """)
        conn.commit()
        start_time = time.time()
        cur.execute("INSERT INTO takes2 SELECT * FROM takes LIMIT %s", (n,))
        conn.commit()
        end_time = time.time()
        times.append((end_time - start_time) * 1000)  # Convert to milliseconds

    return statistics.median(times)

def main():
    conn = psycopg2.connect(
        dbname="univ8",
        user="postgres",
        password="postgres",
        host="localhost",
        port="20000"
    )
    cur = conn.cursor()

    N_values = [3000, 6000, 9000, 12000, 18000, 24000, 30000]

    insert_without_pk_times = []
    add_pk_times = []
    insert_with_pk_times = []
    insert_plus_add_pk_times = []

    for n in N_values:
        insert_without_pk_time, add_pk_time = measure_insert_time(cur, n, conn)
        insert_without_pk_times.append(insert_without_pk_time)
        add_pk_times.append(add_pk_time)

        insert_with_pk_time = measure_insert_with_pk_time(cur, n, conn)
        insert_with_pk_times.append(insert_with_pk_time)

        insert_plus_add_pk_times.append(insert_without_pk_time + add_pk_time)

    plt.figure(figsize=(10, 6))
    plt.plot(N_values, insert_without_pk_times, label='Insert without PK Time')
    plt.plot(N_values, add_pk_times, label='Add PK Time')
    plt.plot(N_values, insert_with_pk_times, label='Insert with PK Time')
    plt.plot(N_values, insert_plus_add_pk_times, label='Insert + Add PK Time')
    plt.xlabel('N')
    plt.ylabel('Time (ms)')
    plt.title('Time vs N')
    plt.legend()
    plt.grid(True)

    plt.savefig('meas.png')

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()

## OBSERVATION
# The plots of (Insert + Add PK Time) and (Insert with PK Time) are quite close, demonstrating little to no difference in time due to the order of primary key addition and insertion of values. The plot of 'Add PK Time' shows a slight increase with N. The plot of 'Insert without PK Time' closely follows the other two plots but remains on the lower side of both of them.