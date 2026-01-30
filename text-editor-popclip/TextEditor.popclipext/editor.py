#!/usr/bin/env python3
import tkinter as tk
from tkinter import scrolledtext
import os
import sys

def main():
    text = os.environ.get('POPCLIP_TEXT', '')

    root = tk.Tk()
    root.title("快速编辑")
    # Increase height slightly to accommodate buttons comfortably
    root.geometry("600x320+400+200")
    root.attributes('-topmost', True)
    root.lift()
    root.focus_force()

    # Tip label
    label = tk.Label(root, text="修改后点击按钮：", anchor='w')
    label.pack(fill=tk.X, padx=15, pady=(15, 5))

    # Create scrolled text area
    text_area = scrolledtext.ScrolledText(
        root,
        wrap=tk.WORD,
        font=("Monaco", 14),
        bg='#ffffff',
        fg='#333333',
        insertbackground='#333333',
        relief=tk.SOLID,
        borderwidth=1
    )
    text_area.pack(fill=tk.BOTH, expand=True, padx=15, pady=5)
    text_area.insert(tk.END, text)
    text_area.focus_set()

    # Move cursor to end
    text_area.mark_set(tk.INSERT, tk.END)
    text_area.see(tk.END)

    # State to track result and action
    # action: 'cancel', 'replace', 'replace_and_send'
    state = {'text': None, 'action': 'cancel'}

    def on_replace():
        state['text'] = text_area.get("1.0", tk.END).rstrip('\n')
        state['action'] = 'replace'
        root.quit()

    def on_replace_and_send():
        state['text'] = text_area.get("1.0", tk.END).rstrip('\n')
        state['action'] = 'replace_and_send'
        root.quit()

    def on_cancel():
        state['text'] = None
        state['action'] = 'cancel'
        root.quit()

    # Button area
    btn_frame = tk.Frame(root)
    btn_frame.pack(fill=tk.X, padx=15, pady=15)

    cancel_btn = tk.Button(btn_frame, text="取消", command=on_cancel, width=8)
    cancel_btn.pack(side=tk.LEFT)

    # Right side buttons
    # Note: pack with side=RIGHT packs from right to left
    send_btn = tk.Button(btn_frame, text="替换并发送", command=on_replace_and_send, width=12)
    send_btn.pack(side=tk.RIGHT)

    replace_btn = tk.Button(btn_frame, text="替换", command=on_replace, width=8)
    replace_btn.pack(side=tk.RIGHT, padx=(0, 10))

    # Shortcuts
    root.bind('<Escape>', lambda e: on_cancel())
    root.bind('<Command-Return>', lambda e: on_replace())
    root.bind('<Command-Shift-Return>', lambda e: on_replace_and_send())
    root.protocol("WM_DELETE_WINDOW", on_cancel)

    root.mainloop()
    try:
        root.destroy()
    except:
        pass

    if state['action'] == 'replace':
        print(state['text'], end='')
        sys.exit(0)
    elif state['action'] == 'replace_and_send':
        print(state['text'], end='')
        sys.exit(2) # Exit code 2 indicates "Replace and Send"
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
