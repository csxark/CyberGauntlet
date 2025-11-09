#include <stdio.h>
#include <string.h>
#define KEY_LENGTH 10 
#define HALF_LENGTH 5 
void process_key(char *key) {
char temp_key[KEY_LENGTH + 1]; 
strncpy(temp_key, key + HALF_LENGTH, HALF_LENGTH);

for (int i = 0; i < HALF_LENGTH; i++) {
key[i + HALF_LENGTH] = key[i];
}

for (int i = 0; i < HALF_LENGTH; i++) {
key[i] = temp_key[i];
}

int start = 0;
int end = HALF_LENGTH - 1;
while (start < end) {
char temp = key[start];
key[start] = key[end];
key[end] = temp;
start++;
end--;
}
}

int main() {
char security_key[] = "A1B2C3D4E5";
printf("Initial Key: %s\n", security_key);
process_key(security_key);
printf("Final Key: FLAG{%s}\n", security_key);
return 0;
}
