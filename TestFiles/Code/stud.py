"""import pandas as pd
import matplotlib.pyplot as plt
data=pd.read_csv("st.csv")
avg=[]

for i in range (0,data.shape[0]):

    sum=0
    for j in range (1,data.shape[1]):
        n=int(data.iloc[i,j])
        sum=sum+n
    avg.append(sum/5)
plt.scatterplot(avg)
plt.xlabel=
print(avg)"""
import pandas as pd
import matplotlib.pyplot as plt

# Step 1: Read the CSV file
df = pd.read_csv("st.csv")

# Step 2: Calculate average marks for each student
# Assuming the first column is 'Name' and the rest are subject marks
df['Average'] = df.iloc[:, 1:].mean(axis=1)
print(df)
# Step 3: Plot the average marks
#plt.figure(figsize=(10, 6))
plt.scatter(df['Name'], df['Average'], color='blue', edgecolors='black')

# Step 4: Add labels and title
plt.xlabel("Student Name")
plt.ylabel("Average Mark")
plt.title("Average Marks of Students")
plt.xticks(rotation=45)
plt.grid(True)
#plt.tight_layout()

# Step 5: Show the plot
plt.show()