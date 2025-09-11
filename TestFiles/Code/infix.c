#include<stdio.h>
#include<stdlib.h>
#define MAX 100

int charstack[MAX];
int intStack[MAX];
int topInt = -1;
char stack[MAX];
int top = -1;
void pushInt(int c) {
    if (topInt == MAX - 1) {
        printf("Int Stack overflow\n");
        return;
    }
    intStack[++topInt] = c;
}

int popInt() {
    if (topInt == -1) {
        printf("Int Stack underflow\n");
        return 0;
    }
    return intStack[topInt--];
}

void push(char c) {
    if (top == MAX - 1) {
        printf("Stack overflow\n");
        return;
    }
    stack[++top] = c;
}

char pop() {
    if (top == -1) {
        return '\0'; // Stack underflow
    }
    return stack[top--];
}

char peek() {
    if (top == -1)
        return '\0';
    return stack[top];
}

int precedence(char op) {
    if (op == '^')
        return 3;
    if (op == '*' || op == '/')
        return 2;
    if (op == '+' || op == '-')
        return 1;
    return 0;
}

int isOperator(char c) {
    return (c == '+' || c == '-' || c == '*' || c == '/' || c == '^');
}
void infixToPostfix(char* infix, char* postfix) {
    int i, k = 0;
    int x=0;
    char c;

    for (i = 0; infix[i] != '\0'; i++) {
        c = infix[i];

        if (isalnum(c)) { 
            postfix[k++] = c;
            if(isdigit(c)){
                x=1;
            }
        }
        else if (c == '(') {
            push(c);
        }
        else if (c == ')') {
            while (peek() != '(' && top != -1) {
                postfix[k++] = pop();
            }
            if (peek() == '(')
                pop(); 
        }
        else if (isOperator(c)) {
            while (isOperator(peek()) && precedence(c) <= precedence(peek())) {
                postfix[k++] = pop();
            }
            push(c);
        }
    }

    while (top != -1) {
        postfix[k++] = pop();
    }
    postfix[k] = '\0';
    printf("Postfix expression: %s\n", postfix);
}
void infixToPrefix(char *infix, char *prefix) {
    strrev(infix);
    int i = 0, j = 0;
    int containsDigit = 0;

    while (infix[i] != '\0') {
        char c = infix[i];
        if (isalnum(c)) {
            prefix[j++] = c;
            if (isdigit(c)) containsDigit = 1;
        }
        else if (c == ')') {
            pushChar(c);
        }
        else if (c == '(') {
            while (peekChar() != ')' && top != -1)
                prefix[j++] = popChar();
            popChar(); 
        }
        else if (isOperator(c)) {
            while (isOperator(peekChar()) && precedence(c) < precedence(peekChar())) {
                prefix[j++] = popChar();
            }
            pushChar(c);
        }
        i++;
    }

    while (top != -1) {
        prefix[j++] = popChar();
    }
    prefix[j] = '\0';
    strrev(prefix);
    printf("Prefix expression: %s\n", prefix);

}
void evalPostfix(char *postfix){
  char p[MAX];
  /*
  char *token=strtok(postfix,"*-+^ /");
  
  while(token!=NULL){
    if(isalpha(*token)){
      
    }
    token = strtok(NULL, "*-+^ /");
  }*/
  for(int i=0;i<strlen(postfix);i++){
    if(isalpha(postfix[i])){
      int num;
      int e[3];
      printf("Enter the value of %c",postfix[i]);
      scanf("%d",&num);
      itoa(num,e,10);
      strcat(p,e);
      strcat(p," ");
    }
    else if (isOperator(postfix[i])){
      strcat(p,postfix[i]);
    }
  }
    printf("%s",p);
                                 
}

