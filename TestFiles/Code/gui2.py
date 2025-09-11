import tkinter as tk

def login():
    username = e1.get()
    password = e2.get()
    print("Username:", username)
    print("Password:", password)

root = tk.Tk()
root.title("Login")
root.geometry("300x200")

tk.Label(root, text="Login Page", font=("Arial", 14)).pack(pady=10)

f = tk.Frame(root)

tk.Label(f, text="Username").grid(row=0, column=0, padx=5, pady=5, sticky="e")
e1 = tk.Entry(f)  # store the Entry widget
e1.grid(row=0, column=1, padx=5, pady=5)

tk.Label(f, text="Password").grid(row=1, column=0, padx=5, pady=5, sticky="e")
e2 = tk.Entry(f, show="*")  # store the Entry widget
e2.grid(row=1, column=1, padx=5, pady=5)

f.pack(pady=10)

btn = tk.Button(root, text="Login", command=login)
btn.pack(pady=10)

root.mainloop()
