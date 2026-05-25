local runtime = {}

local function pad_right(value, width)
    if #value >= width then
        return value
    end

    return value .. string.rep(" ", width - #value)
end

function runtime.rule(char, width)
    local line_char = char or "="
    local line_width = width or 36
    return string.rep(line_char, line_width)
end

function runtime.banner(title)
    local text = " " .. title .. " "
    local width = math.max(#text, 28)
    local border = runtime.rule("=", width)

    return border .. "\n" .. text .. "\n" .. border
end

function runtime.kv(label, value)
    return pad_right(label .. ":", 18) .. tostring(value)
end

return runtime
