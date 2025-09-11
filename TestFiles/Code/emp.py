a=[]
with open("emp.txt","r") as file:
    l=file.readlines()
    
for i in l:
    b=i.strip().split(",")
    b.append(0)
    a.append(b)
for i in range (0,len(a)):
    a[i][3]=str(int(a[i][1])*int(a[i][2]))
print(a)
with open("report.txt","w") as file:
    file.write(f"{"Name":<15}  {"Hours Worked":<15}  {"Total Wage":<15}\n")
    for i in range (0,len(a)):
        file.write(f"{a[i][0]:<15}  {a[i][2]:<15}  {a[i][3]:<15}\n")