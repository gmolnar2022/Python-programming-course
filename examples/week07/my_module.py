# my_module.py

def square(x):
    """Return the square of x."""
    return x * x


def factorial(n):
    """Return n! for a non-negative integer n."""
    if n == 0:
        return 1
    else:
        return n * factorial(n - 1)


greeting = "Hello, World!"
