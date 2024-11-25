import csv

# Specification of parsing pattern
EXPECTED_TOKENS={}
EXPECTED_TOKENS["1a"]=[ "select", "*", "from", "???", ";" ]
EXPECTED_TOKENS["1b"]=[ "select", "*", "from", "???", "where", "???", "=", "???", ";" ]
EXPECTED_TOKENS["1c"]=[ "select", "???", "from", "???", "where", "???", "=", "???", ";" ]
EXPECTED_TOKENS["2"]=[ "select", "*", "from", "???", "where", "???", "=", "???", ";" ]
EXPECTED_TOKENS["3"]=[ "select", "count", "from", "???", "where", "???", "=", "???", ";" ]
q4sub_pattern=[ "(", "select", "???", "from", "???", "where", "???", "=", "???", ")" ]
EXPECTED_TOKENS["4a"]=q4sub_pattern+["intersect"]+q4sub_pattern+[";"]
EXPECTED_TOKENS["4b"]=q4sub_pattern+["union"]+q4sub_pattern+[";"]

# CSV files directory
file_dir="../csv-files/"
advisor="../csv-files/advisor.csv"
classroom="../csv-files/classroom.csv"
course="../csv-files/course.csv"
department="../csv-files/department.csv"
instructor="../csv-files/instructor.csv"
prereq="../csv-files/prereq.csv"
section="../csv-files/section.csv"
student="../csv-files/student.csv"
takes="../csv-files/takes.csv"
teaches="../csv-files/teaches.csv"
time_slot="../csv-files/time_slot.csv"

qtype = input("Query Type? ")
query = input("Enter your query: ")
tokens = query.split()

l = len(EXPECTED_TOKENS[qtype])
if l != len(tokens):
    print(l)
    print(len(tokens))
    print("Invalid query")

if qtype == "1a":
    rel = tokens[3]
elif qtype == "1b":
    rel = tokens[3]
    col = tokens[5]
    val = tokens[7].strip("'")
elif qtype == "1c":
    rel = tokens[3]
    cols = tokens[1].split(',')
    colx = tokens[5]
    # print(cols)
    val = tokens[7].strip("'")   
elif qtype == "2":
    rels = tokens[3].split(',')
    rel1 = rels[0]
    rel2 = rels[1]
    c1_ = tokens[5].split('.')
    c1 = c1_[1]
    c2_ = tokens[7].split('.')
    c2 = c2_[1]

elif qtype == "3":
    rel = tokens[3]
    col = tokens[5]
    val = tokens[7].strip("'")

elif qtype == "4a":
    col = tokens[2]
    rel1 = tokens[4]
    colx = tokens[6]
    val1 = tokens[8].strip("'")
    rel2 = tokens[15]
    coly = tokens[17]
    val2 = tokens[19].strip("'")



# elif qtype == "4a":

elif qtype == "4b":
    col = tokens[2]
    rel1 = tokens[4]
    colx = tokens[6]
    val1 = tokens[8]
    val1 = val1.strip("'")
    rel2 = tokens[15]
    coly = tokens[17]
    val2 = tokens[19].strip("'")


# for i in range(0,l):
#     EXPECTED_TOKENS[qtype][i] == tokens[i]
  
if qtype == "2" or qtype == "4a" or qtype == "4b":
    with open(file_dir + rel1 + ".csv", 'r') as file1:
        with open(file_dir + rel2 + ".csv", 'r') as file2:
            csv_reader1 = csv.DictReader(file1)
            data1 = list(csv_reader1)
            csv_reader2 = csv.DictReader(file2)
            data2 = list(csv_reader2)
            
            if qtype == "2":
                for row1 in data1:
                    for row2 in data2:
                        if row1[c1] == row2[c2]:
                            print(','.join(row1.values()), end=",")
                            print(','.join(row2.values()))

            elif qtype == "4a":
                c1 = []
                c2 = []
                for row1 in data1:
                    if row1[colx] == val1:
                        c1.append(row1[col])
                for row2 in data2:
                    if row2[coly] == val2:
                        c2.append(row2[col])
                # print(c1)
                # print(c2)
                # subset_data1 = [row for row in data1 if row.get(colx) == val1]
                # print(subset_data1)
                # subset_data2 = [row for row in data2 if row.get(colx) == val2]
                # print(subset_data2)
                intn = [x for x in c1 if x in c2]
                # print(intn)
                for i in intn:
                    # print(','.join(intn.values()))
                    print(i)
            elif qtype == "4b":
                c1 = []
                c2 = []
                for row1 in data1:
                    if row1[colx] == val1:
                        c1.append(row1[col])
                for row2 in data2:
                    if row2[coly] == val2:
                        c2.append(row2[col])
                # subset_data1 = [row for row in data1 if row.get(colx) == val1]
                # subset_data2 = [row for row in data2 if row.get(colx) == val2]
                # union = [x for x in c1]
                # union.append([x for x in c2 if x not in union])
                # print(union)
                union = list(set(c1) | set(c2))
                for i in union:
                    # print(','.join(union.values()))
                    print(i)

else:
    with open(file_dir + rel + ".csv", 'r') as file:
        csv_reader = csv.DictReader(file)
        data = list(csv_reader)
        if qtype == "1a":
            for row in data:
                print(','.join(row.values()))
    
        elif qtype == "1b":
            subset_data = [row for row in data if row.get(col) == val]

            for row in subset_data:
                # if row[col] == val:
                print(','.join(row.values()))
    
        elif qtype == '1c':
        # for row in data:
        #     if row[col] == val:

            for c in cols:
                subset_data = [row for row in data if row.get(colx) == val]
        
            list = []
            for r in subset_data:
                for i in range(len(cols)-1):
                    print(r[cols[i]]+',', end="")
                print(r[cols[len(cols)-1]])

    
        elif qtype == "3":
            subset_data = [row for row in data if row.get(col) == val]
            print(len(subset_data))
        # for row in subset_data:
        #     # if row[col] == val:
        #     print(','.join(row.values()))



        

            
    