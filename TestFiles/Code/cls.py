class Student:
    def __init__(self, name, age, grades):
        if not isinstance(age, int) or age <= 0:
            raise ValueError("Age must be a positive integer.")
        if not all(isinstance(g, (int, float)) and 0 <= g <= 100 for g in grades):
            raise ValueError("Grades must be numbers between 0 and 100.")

        self.name = name
        self.age = age
        self.grades = grades

    def average_grade(self):
        return sum(self.grades) / len(self.grades) if self.grades else 0

    def display(self):
        print(f"Name: {self.name}, Age: {self.age}, Grades: {self.grades}, Average: {self.average_grade():.2f}")

# In-memory list to store Student objects
students = []

# Utility function to find a student by name
def find_student(name):
    for student in students:
        if student.name.lower() == name.lower():
            return student
    return None

def add_student():
    try:
        name = input("Enter name: ")
        age = int(input("Enter age: "))
        grades = list(map(float, input("Enter grades (space-separated): ").split()))
        student = Student(name, age, grades)
        students.append(student)
        print(f"Student '{name}' added.")
    except ValueError as ve:
        print("Error:", ve)

def update_student():
    name = input("Enter name of student to update: ")
    student = find_student(name)
    if student:
        try:
            age = int(input("Enter new age: "))
            grades = list(map(float, input("Enter new grades: ").split()))
            student.age = age
            student.grades = grades
            print(f"Student '{name}' updated.")
        except ValueError as ve:
            print("Error:", ve)
    else:
        print("Student not found.")

def delete_student():
    name = input("Enter name of student to delete: ")
    student = find_student(name)
    if student:
        students.remove(student)
        print(f"Student '{name}' deleted.")
    else:
        print("Student not found.")

def view_student():
    name = input("Enter name of student to view: ")
    student = find_student(name)
    if student:
        student.display()
    else:
        print("Student not found.")

def list_students():
    if not students:
        print("No students in the system.")
    else:
        for student in students:
            student.display()

def menu():
    while True:
        print("\n===== Student Records Menu =====")
        print("1. Add Student")
        print("2. Update Student")
        print("3. Delete Student")
        print("4. View Student")
        print("5. List All Students")
        print("6. Exit")
        choice = input("Enter your choice: ")

        if choice == "1":
            add_student()
        elif choice == "2":
            update_student()
        elif choice == "3":
            delete_student()
        elif choice == "4":
            view_student()
        elif choice == "5":
            list_students()
        elif choice == "6":
            print("Exiting...")
            break
        else:
            print("Invalid choice. Please enter 1-6.")

# Run the app
if __name__ == "__main__":
    menu()
