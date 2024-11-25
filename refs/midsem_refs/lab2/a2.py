import argparse, psycopg2, sys, csv, os
from http.client import FOUND
from psycopg2.extras import execute_values
import re
from datetime import datetime

def main(args):
    connection = psycopg2.connect(host = args.host, port = args.port, database = args.name, user = args.user, password = args.pswd)
    cursor = connection.cursor()

    if(args.export_ddl):
        csv_dir = args.csv_dir
        output_path = args.output_path
        # PART 1
        #get all the files with dependencies
        all_files = [f for f in os.listdir(csv_dir) if f.endswith(".csv")]
        n = len(all_files)
        ddl_statements = []
        tables_done =[]
        prim_keys = []

        for filename in all_files:
            table_name = os.path.splitext(filename)[0]
            ddl_statements.append(f"DROP TABLE IF EXISTS {table_name} CASCADE;")
        
        for filename in all_files:
                table_name = os.path.splitext(filename)[0]

                with open(os.path.join(csv_dir, filename), 'r') as csv_file:
                    reader = csv.reader(csv_file)
                    column_names = next(reader)

                for column_name in column_names:
                        if column_name.endswith("_id") and column_name == f"{table_name}_id" :
                            prim_keys.append(column_name)

        while len(tables_done) != n:
            for filename in all_files:
                table_name = os.path.splitext(filename)[0]
                if table_name in tables_done:
                    continue

                with open(os.path.join(csv_dir, filename), 'r') as csv_file:
                    reader = csv.reader(csv_file)
                    column_names = next(reader)
                    column_definitions = []

                    a = True
                    for column_name in column_names:
                        if (column_name.endswith("_id") ) and not column_name.endswith(f"{table_name}_id"):
                            if column_name not in prim_keys:
                                continue
                            referenced_table = column_name.rsplit('_', 1)[0]
                            if referenced_table not in tables_done:
                                a = False

                        elif column_name.endswith(f"_key"):
                            referenced_table = column_name.rsplit('_', 2)[1]
                            if referenced_table not in tables_done:
                                a = False
                    if a:
                        # print(table_name)
                        # continue

                        col_dtypes = {column: 'TEXT' for column in column_names}
                        for row in reader:
                            for col, value in zip(column_names,row):
                                if value.isdigit():
                                    col_dtypes[col] = 'INT'
                                elif re.match(r'\d{4}-\d{2}-\d{2}', value):
                                    col_dtypes[col] = 'DATE'
                                    # for c in column_names[col]:
                                    #     date = datetime.strptime(c, "%Y, %m, %d")
                                    #     formatted_date = date.strftime("%Y-%m-%d")
                                    #     formatted_date_str = str(formatted_date)
                                    #     c = formatted_date_str
                                else:
                                    continue


                        for column_name in column_names:
                            if column_name.endswith(f"_{table_name}_key"):
                                referenced_table = column_name.rsplit('__', 1)[0]
                                column_definitions.append(f"{column_name} INTEGER REFERENCES {referenced_table} on DELETE set null")
                            elif col_dtypes[column_name] == 'INT':
                                column_definitions.append(f"\n	{column_name} INT")
                            elif col_dtypes[column_name] == 'DATE':
                                column_definitions.append(f"\n	{column_name} DATE")
                            else:
                                column_definitions.append(f"\n	{column_name} TEXT")
                            
                        found = False
                        for column_name in column_names:
                            if column_name.endswith("_id") and column_name == f"{table_name}_id" :
                                found = True
                                column_definitions.append(f"\n	PRIMARY KEY ({column_name}),")
                        if found == False:
                            prim = ""
                            for column_name in column_names:
                                if column_name.endswith("_id") :
                                    prim += column_name + ","
                            prim = prim.rstrip(',')
                            column_definitions.append(f"\n	PRIMARY KEY ({prim}),")

                        ddl_statements.append(f"CREATE TABLE {table_name} (	{', '.join(column_definitions)}")
            
                        # for filename in all_files:
                        for column_name in column_names:
                            if (column_name.endswith("_id") ) and not column_name.endswith(f"{table_name}_id"):
                                if column_name not in prim_keys:
                                    continue
                                referenced_table = column_name.rsplit('_', 1)[0]
                                ddl_statements.append(f"\tFOREIGN KEY ({column_name}) REFERENCES {referenced_table} on DELETE set null,")

                            elif column_name.endswith(f"_key"):
                                referenced_table = column_name.rsplit('_', 2)[1]

                                ddl_statements.append(f"\tFOREIGN KEY ({column_name}) REFERENCES {referenced_table} on DELETE set null,")

                        ddl_statements[-1] = ddl_statements[-1].rstrip(',')
                        ddl_statements.append(");\n")
                        with open(output_path, 'w') as ddl_file:
                            ddl_file.write('\n'.join(ddl_statements))
                        tables_done.append(table_name)




    if(args.import_table_data):
        csv_filepath = args.path
        table = args.table
        # PART 2
        cursor = connection.cursor()
        with open(csv_filepath, 'r') as csv_file:

            reader = csv.reader(csv_file)
            # print(list(reader))
            matrix = list(reader)
            header = matrix[0]
            columns= ', '.join(header)
            insert_query = f"INSERT INTO {table} ({columns}) VALUES %s"

            execute_values(cursor, insert_query, matrix[1:])

        connection.commit()
        # cursor.close()


    if(args.export_table_data):
        format = args.format
        table = args.table
        output_path = args.output_path
        # PART 3
        
        cursor.execute(f"SELECT * FROM {table};")
        rows = cursor.fetchall()
        column_names = [desc[0] for desc in cursor.description]

        if format == "csv":
            if output_path:
                with open(output_path, 'w+', newline='') as csv_file:
                    csv_writer = csv.writer(csv_file)
                    csv_writer.writerow(column_names)
                    csv_writer.writerows(rows)
                    # for row in rows:
                    #     csv_writer.writerow(map(str, row))

            else:
                print(','.join(column_names))
                for row in rows:
                    print('.'.join(map(str, row)))
        
        elif format == "sql":
            if output_path:
                with open(output_path, 'w') as sql_file:
                    for row in rows:
                        # values = ', '.join([f"'{value}'" if isinstance(value, str) else str(value) for value in row])
                        # sql_file.write(f"INSERT INTO {table} ({', '.join(column_names)}) VALUES ({values});\n")
                        values = ', '.join(map(repr, row))
                        sql_file.write(f"INSERT INTO {table} ({', '.join(column_names)}) VALUES ({values});\n")
            else:

                for row in rows:
                    # values = ', '.join([f"'{value}'" if isinstance(value, str) else str(value) for value in row])
                    values = ', '.join(map(repr, row))
                    print(f"INSERT INTO {table} ({', '.join(column_names)}) VALUES ({values});\n")

            cursor.close()
            connection.close()

    if(args.testing):
        cursor.execute("DROP TABLE IF EXISTS test;")
        cursor.execute("CREATE TABLE test (id serial PRIMARY KEY, num integer, data varchar);")
        cursor.execute("INSERT INTO test (num, data) VALUES (%s, %s)", (100, "abc'def"))
        cursor.execute("INSERT INTO test (num, data) VALUES (%s, %s)", (200, "abc'def"))
        cursor.execute("INSERT INTO test (num, data) VALUES (%s, %s)", (100, "abc'def"))
        
        cursor.execute("SELECT * FROM test;")
        row = cursor.fetchone()
        while row != None:
            print(row)
            row = cursor.fetchone()
        
        cursor.execute("SELECT * FROM test where num = 100;")
        print(cursor.fetchall())

        cursor.execute("SELECT * FROM test;")
        print(cursor.fetchmany(3))

    if connection:
        cursor.close()
        connection.close()        

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--name")
    parser.add_argument("--user")
    parser.add_argument("--pswd")
    parser.add_argument("--host")
    parser.add_argument("--port")
    parser.add_argument("--export-ddl", action='store_true')
    parser.add_argument("--import-table-data", action='store_true')
    parser.add_argument("--export-table-data", action='store_true')
    parser.add_argument("--csv_dir")
    parser.add_argument("--output_path")
    parser.add_argument("--table")
    parser.add_argument("--path")
    parser.add_argument("--format")
    parser.add_argument("--testing", action = 'store_true')

    args = parser.parse_args()
    main(args)
