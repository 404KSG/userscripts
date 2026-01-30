#!/bin/bash

# 1. 获取当前最前端的应用名称 (Source App)
SOURCE_APP=$(osascript -e 'tell application "System Events" to get name of first process whose frontmost is true')

# 2. 获取 PopClip 选中的文本
TEXT="$POPCLIP_TEXT"
# 如果没有文本，直接退出
if [ -z "$TEXT" ]; then
    exit 0
fi

# 3. 转义文本以便在 AppleScript 中使用
ESCAPED_TEXT=$(echo "$TEXT" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')

# 4. 调用 AppleScript 显示对话框
# 需求：
# - 两个按钮：{"替换", "发送"}
# - 默认按钮(蓝色)："发送"
# - 没有取消按钮 (注意：这会导致 Esc 键失效，除非用户点击按钮或等待超时)
RESULT=$(osascript <<EOF
set originalText to "$ESCAPED_TEXT"

tell application "System Events"
    activate
    try
        set dialogResult to display dialog "编辑文本：" default answer originalText buttons {"替换", "发送"} default button "发送" with title "快速编辑" giving up after 600

        set btn to button returned of dialogResult
        set txt to text returned of dialogResult

        if btn is "发送" then
            return "ACTION_SEND:" & txt
        else if btn is "替换" then
            return "ACTION_REPLACE:" & txt
        else
            return "CANCEL"
        end if
    on error
        return "CANCEL"
    end try
end tell
EOF
)

# 5. 处理返回结果
if [ "$RESULT" = "CANCEL" ] || [ -z "$RESULT" ]; then
    # 激活原窗口并退出
    osascript -e "tell application \"$SOURCE_APP\" to activate"
    exit 0
fi

# 提取动作和文本
if [[ "$RESULT" == "ACTION_SEND:"* ]]; then
    ACTION="SEND"
    CONTENT="${RESULT#ACTION_SEND:}"
elif [[ "$RESULT" == "ACTION_REPLACE:"* ]]; then
    ACTION="REPLACE"
    CONTENT="${RESULT#ACTION_REPLACE:}"
else
    # 异常情况
    exit 1
fi

# 6. 处理文本内容 (简单去首尾空格)
CONTENT=$(echo -n "$CONTENT")

# 7. 将内容放入剪贴板
printf '%s' "$CONTENT" | pbcopy

# 8. 执行粘贴操作
osascript <<EOF
tell application "$SOURCE_APP"
    activate
end tell
delay 0.2
tell application "System Events"
    -- 发送 Ctrl+C 清除当前行
    keystroke "c" using control down
    delay 0.1
    -- 粘贴
    keystroke "v" using command down
    delay 0.1

    -- 如果是发送模式，按下回车
    if "$ACTION" is "SEND" then
        key code 36 -- Enter
    end if
end tell
EOF
