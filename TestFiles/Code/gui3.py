import tkinter as tk
import time
y=time.localtime().tm_year
x=time.localtime().tm_mon
da=time.localtime().tm_mday
def cal():
    i=date.get()
    d=i.split("-")
    agee=y-int(d[2])
    if x>int(d[1]):
        month=x-int(d[1])
    else:
        agee-=1
        month=int(d[1])
    if da>int(d[0]):
        dat=da-int(d[0])
    else:
        month-=1
        dat=30-(int(d[0])-da)+1
    age.config(text=f"Your are {agee} years,{month} months,{dat} days old")
root = tk.Tk()
root.title('Find Age')

window_width = 300
window_height = 200

# get the screen dimension
screen_width = root.winfo_screenwidth()
screen_height = root.winfo_screenheight()

# find the center point
center_x = int(screen_width/2 - window_width / 2)
center_y = int(screen_height/2 - window_height / 2)

# set the position of the window to the center of the screen
root.geometry(f'{window_width}x{window_height}+{center_x}+{center_y}')
l=tk.Label(root,text="Enter the Date Of Birth")
l.pack(pady=10)
date=tk.Entry(root,text="DD-MM-YYYY",width=20)
date.pack(pady="5")
age=tk.Label(root,text="")
age.pack(pady="5")
btn=tk.Button(root,text="Calculate the age",command=cal)
btn.pack(pady="5")
root.mainloop()