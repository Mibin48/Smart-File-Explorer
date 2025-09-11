import tkinter as tk
from tkinter import ttk, messagebox

# In-memory list to store books
books = []

# Functions
def add_book():
    title = title_var.get().strip()
    author = author_var.get().strip()
    stock = stock_var.get().strip()

    if not title or not author or not stock.isdigit():
        messagebox.showwarning("Invalid Input", "Enter valid title, author, and numeric stock.")
        return

    books.append({'title': title, 'author': author, 'stock': int(stock)})
    clear_fields()
    display_books()

def update_stock():
    selected = tree.selection()
    if not selected:
        messagebox.showwarning("No Selection", "Select a book to update.")
        return

    stock = stock_var.get().strip()
    if not stock.isdigit():
        messagebox.showwarning("Invalid Input", "Stock must be a number.")
        return

    index = tree.index(selected)
    books[index]['stock'] = int(stock)
    clear_fields()
    display_books()

def delete_book():
    selected = tree.selection()
    if not selected:
        messagebox.showwarning("No Selection", "Select a book to delete.")
        return

    index = tree.index(selected)
    del books[index]
    display_books()

def search_books():
    keyword = search_var.get().strip().lower()
    results = [
        book for book in books
        if keyword in book['title'].lower() or keyword in book['author'].lower()
    ]
    display_books(results)

def display_books(book_list=None):
    tree.delete(*tree.get_children())
    for book in (book_list if book_list is not None else books):
        tree.insert("", tk.END, values=(book['title'], book['author'], book['stock']))

def clear_fields():
    title_var.set("")
    author_var.set("")
    stock_var.set("")

# GUI Setup
root = tk.Tk()
root.title("Simple Library System")
root.geometry("600x400")

# Variables
title_var = tk.StringVar()
author_var = tk.StringVar()
stock_var = tk.StringVar()
search_var = tk.StringVar()

# Input Frame
form = tk.Frame(root)
form.pack(pady=10)

tk.Label(form, text="Title").grid(row=0, column=0)
tk.Entry(form, textvariable=title_var).grid(row=0, column=1)

tk.Label(form, text="Author").grid(row=1, column=0)
tk.Entry(form, textvariable=author_var).grid(row=1, column=1)

tk.Label(form, text="Stock").grid(row=2, column=0)
tk.Entry(form, textvariable=stock_var).grid(row=2, column=1)

tk.Button(form, text="Add", command=add_book).grid(row=3, column=0, pady=5)
tk.Button(form, text="Update Stock", command=update_stock).grid(row=3, column=1)
tk.Button(form, text="Delete", command=delete_book).grid(row=3, column=2)

# Search Frame
search_frame = tk.Frame(root)
search_frame.pack()
tk.Entry(search_frame, textvariable=search_var, width=30).pack(side=tk.LEFT)
tk.Button(search_frame, text="Search", command=search_books).pack(side=tk.LEFT)
tk.Button(search_frame, text="Show All", command=display_books).pack(side=tk.LEFT)

# Table
tree = ttk.Treeview(root, columns=("Title", "Author", "Stock"), show="headings")
tree.heading("Title", text="Title")
tree.heading("Author", text="Author")
tree.heading("Stock", text="Stock")
tree.pack(pady=10, fill=tk.BOTH, expand=True)

root.mainloop()
