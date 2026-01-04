#!/usr/bin/env python3
import time
import sys

def main():
    """
    Mock MHS-3.5inch display with PTT button.
    This script simulates PTT events by printing to stdout.
    """
    print("MHS Display Mock Started", file=sys.stderr)
    try:
        while True:
            # Simulate a button press and hold for 2 seconds
            print("PTT_START")
            sys.stdout.flush()
            time.sleep(2)
            print("PTT_STOP")
            sys.stdout.flush()
            time.sleep(5)
    except KeyboardInterrupt:
        print("MHS Display Mock Stopped", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()
