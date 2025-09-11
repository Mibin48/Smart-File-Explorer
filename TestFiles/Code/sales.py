import pandas as pd
import matplotlib.pyplot as plt

# Step 1: Create assumed sales data
data = {
    'date': [
        '2024-06-01', '2024-06-01', '2024-06-02', '2024-06-02', '2024-06-03',
        '2024-06-03', '2024-06-04', '2024-06-04', '2024-06-05', '2024-06-05'
    ],
    'product_id': [1, 2, 1, 3, 2, 4, 3, 5, 4, 5],
    'quantity_sold': [10, 5, 8, 12, 7, 10, 15, 6, 9, 10],
    'sales_amount': [100.0, 75.0, 80.0, 150.0, 70.0, 130.0, 180.0, 90.0, 110.0, 140.0]
}

# Convert to DataFrame
df = pd.DataFrame(data)
print(df)
# Step 2: Save to CSV
csv_filename = 'sales_data.csv'
df.to_csv(csv_filename, index=False)

# Step 3: Read the data from CSV
df = pd.read_csv(csv_filename)

# Step 4: Calculate total sales per product
total_sales = df.groupby('product_id')['sales_amount'].sum()

# Step 5: Sort the products by total sales
sorted_sales = total_sales.sort_values(ascending=False)

# Step 6: Plot the bar graph
plt.figure(figsize=(8, 5))
sorted_sales.plot(kind='bar', color='skyblue')
plt.title('Total Sales per Product')
plt.xlabel('Product ID')
plt.ylabel('Total Sales Amount')
plt.xticks(rotation=0)
plt.tight_layout()

# Step 7: Save the plot as an image
plot_filename = 'total_sales_per_product.png'
plt.savefig(plot_filename)
plt.show()
