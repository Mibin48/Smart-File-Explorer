import tkinter as tk
def click(i):
    if(i== "="):
        cal()
    else:
        result.insert(tk.END,i)
def cal():
    ans=eval(result.get())
    result.delete(0,tk.END)
    result.insert(tk.END,ans)
def clear():
    result.delete(0,tk.END)

root=tk.Tk()
root.title("Calculator")
root.geometry("400x600")
root.configure(bg="grey")
result=tk.Entry(root, text="0", font=("Arial", 24), bg="white", width=15)
result.pack(pady=20)
l=['9','8','7','6','5','4','3','2','1','0','.','+','-','*','/','=']
p=tk.Frame(root)
p.configure(bg="grey")
r=0
c=0
for i in l:
    btn=tk.Button(p,text=i,height=2,width=5,font=("Arial",20),command=lambda i=i:click(i))
    btn.grid(row=r,column=c,padx=5,pady=5)
    c+=1
    if c==4:
        r+=1
        c=0
p.pack()
btn=tk.Button(root,text="CLR",height=2,width=23,font=("Arial",20),command=clear)
btn.pack(pady=5)

root.mainloop()