import argparse, psycopg2, sys, csv, os
from psycopg2.extras import execute_values

def findDataType(row):
    dt = []
    for i in row:
        if i == "":
            dt.append("TEXT")
        elif i.isnumeric():
            dt.append("INT")
        elif i.split('-')[0].isnumeric() and i.split('-')[1].isnumeric() and i.split('-')[2].isnumeric():
            dt.append("DATE")
        else:
            dt.append("TEXT")
    return dt

class csv_reader:
    def __init__(self, csv_dir, csv_file, table_name, table_list):
        with open(os.path.join(csv_dir, csv_file), 'r') as file:
              reader = csv.reader(file)
              l = 0
              rows = []
              for lines in reader:
                 if l == 0:
                      columns = lines
                      l = 1
                 else:
                    rows.append(lines)
              row = rows[0]
              type = findDataType(row)
              primaryKey = []
              if table_name+"_id" in columns:
                  primaryKey.append(table_name+"_id")
              else:
                  for i in columns:
                      if i.endswith("_id"):
                          primaryKey.append(i)
              foreignKey = []
              fTables = []
              for i in columns:
                  if i.endswith("_key"):
                      tn = i.split("__")[1].split("_")[0]
                      fTables.append(tn)
                      foreignKey.append(i)
                  elif i.endswith("_id") and i[:-3] in table_list and i[:-3] != table_name:
                      foreignKey.append(i)
                      fTables.append(i[:-3])
              self.primaryKey = primaryKey
              self.foreignKey = foreignKey
              self.fTables = fTables
              self.columns = columns
              self.printed = False
              self.table_name = table_name
              self.type = type
    def print(self, tables):
        if not self.printed:
            self.printed = True
            for t in self.fTables:
                tables[t].print(tables)
            print(f"CREATE TABLE {self.table_name} (", file=file)
            for i in range(len(self.columns)):
                print(f"\t{self.columns[i]} {self.type[i]},", file=file)
            print(f"\tPRIMARY KEY(", end = "", file=file)
            for i in range(len(self.primaryKey)-1):
                print(f"{self.primaryKey[i]}", end = ", ", file=file)
            if len(self.foreignKey) != 0:
                print(f"{self.primaryKey[-1]}),", file=file)
                for i in range(len(self.foreignKey)-1):
                    print(f"\tFOREIGN KEY({self.foreignKey[i]}) REFERENCES {self.fTables[i]},", file=file)
                print(f"\tFOREIGN KEY({self.foreignKey[-1]}) REFERENCES {self.fTables[-1]}", file=file)
            else:
                print(f"{self.primaryKey[-1]})", file=file)
            print(");", file=file)
            print(file=file)


def export(rows, columns, format, output_path, table):
    foo = lambda x : "'"+str(x)+"'"
    if output_path:
        with open(output_path, 'w') as f:
            if format == "csv":
                print(','.join(columns), file=f)
                for r in rows:
                    print(','.join(map(str,r)), file=f)
            if format == "sql":
                for r in rows:
                    print(f"INSERT INTO {table} ({', '.join(columns)}) values ({', '.join(map(foo,r))});", file=f)
    else:
       if format == "csv":
            print(','.join(columns))
            for r in rows:
                print(','.join(map(str,r)))
       if format == "sql":
            for r in rows:
                print(f"INSERT INTO {table} ({', '.join(columns)}) values ({', '.join(map(foo,r))});") 

        
def main(args):
    connection = psycopg2.connect(host = args.host, port = args.port, database = args.name, user = args.user, password = args.pswd)
    cursor = connection.cursor()
    global file

    if(args.export_ddl):
        csv_dir = args.csv_dir
        output_path = args.output_path
        file = sys.stdout
        if output_path:
            file = open(output_path, 'w')
        # PART 1
        table_list = []
        for csv_file in os.listdir(csv_dir):
          if csv_file.endswith(".csv"):
              table_name = csv_file.split(".")[0]
              table_list.append(table_name)
              print(f"DROP TABLE IF EXISTS {table_name} CASCADE;", file=file)
        tables = {}
        for csv_file in os.listdir(csv_dir):
          if csv_file.endswith(".csv"):
            table_name = csv_file.split(".")[0]
            tables[table_name] = csv_reader(csv_dir, csv_file, table_name, table_list)
        for i in tables.keys():
            tables[i].print(tables)                
    
    if(args.import_table_data):
        csv_filepath = args.path
        table = args.table
        # PART 2
        with open(csv_filepath, 'r') as file:
            reader = csv.reader(file)
            l = 0
            rows = []
            for lines in reader:
                if l == 0:
                    columns = lines
                    l = 1
                else:
                    rows.append(lines)
            insert_query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES %s;"
            execute_values(cursor, insert_query, rows)
            connection.commit()
        
    if(args.export_table_data):
        format = args.format
        table = args.table
        output_path = args.output_path
        # PART 3
        cursor.execute(f"SELECT * FROM {table};")
        rows = cursor.fetchall()
        columns = [x.name for x in cursor.description]
        export(rows, columns, format, output_path, table)

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
