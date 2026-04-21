import { createSignal, JSX, splitProps, Show } from "solid-js";

// 1. 定义支持的变体类型，涵盖重置、应用、存档、设置等所有场景
type ButtonVariant = "primary" | "secondary" | "reset" | "ghost" | "danger";

interface StyledButtonProps
    extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    loadingText?: string;
    icon?: JSX.Element;
    fullWidth?: boolean;
    size?: "medium" | "small";
}

// 2. 抽离样式配置表
const VARIANT_MAP: Record<
    ButtonVariant,
    { bg: string; hover: string; text: string; border?: string }
> = {
    primary: { bg: "#fb7299", hover: "#ff85a7", text: "#ffffff" }, // B站粉 (应用)
    secondary: { bg: "#00aeec", hover: "#26bcff", text: "#ffffff" }, // B站蓝 (存档)
    reset: { bg: "#e3e5e7", hover: "#d1d4d7", text: "#61666d" }, // 灰色 (重置)
    ghost: {
        bg: "#f6f7f9",
        hover: "#ffeef3",
        text: "#61666d",
        border: "#e3e5e7",
    }, // 设置按钮
    danger: { bg: "#ff4d4f", hover: "#ff7875", text: "#ffffff" }, // 删除按钮
};

const StyledButton = (props: StyledButtonProps) => {
    // 3. 使用 splitProps 保持响应式，并分离自定义属性
    const [local, others] = splitProps(props, [
        "size",
        "variant",
        "loadingText",
        "icon",
        "fullWidth",
        "children",
        "style",
        "onMouseEnter",
        "onMouseLeave",
        "onClick",
    ]);

    const [isHovered, setIsHovered] = createSignal(false);
    const [isLoading, setIsLoading] = createSignal(false);

    const runHandler = (handler: any, event: MouseEvent | PointerEvent) => {
        if (!handler) return;
        if (typeof handler === "function") {
            handler(event);
        } else if (Array.isArray(handler)) {
            const [fn, arg] = handler;
            fn(arg, event);
        }
        setIsLoading(true);

        setTimeout(() => {
            setIsLoading(false);
        }, 2000); // 模拟加载状态，实际应用中应根据具体逻辑调整
    };

    // 5. 派生计算样式
    const theme = () => VARIANT_MAP[local.variant || "primary"];

    return (
        <button
            {...others}
            disabled={props.disabled || isLoading()}
            // 统一事件拦截处理
            onClick={(e) => {
                runHandler(local.onClick, e);
            }}
            onMouseEnter={(e) => {
                setIsHovered(true);
                runHandler(local.onMouseEnter, e);
            }}
            onMouseLeave={(e) => {
                setIsHovered(false);
                runHandler(local.onMouseLeave, e);
            }}
            style={{
                display: "inline-flex",
                "align-items": "center",
                "justify-content": "center",
                gap: "4px",
                flex: local.fullWidth ? "1" : "none",
                background: isHovered() ? theme().hover : theme().bg,
                color:
                    isHovered() && local.variant === "ghost"
                        ? "#fb7299"
                        : theme().text,
                border: theme().border
                    ? `1px solid ${
                          isHovered() && local.variant === "ghost"
                              ? "#ffb3c1"
                              : theme().border
                      }`
                    : "none",
                padding: local.size === "small" ? "2px 6px" : "8px 12px",
                "border-radius": "6px",
                cursor:
                    props.disabled || isLoading() ? "not-allowed" : "pointer",
                "font-size": "13px",
                "font-weight": local.variant === "ghost" ? "normal" : "bold",
                transition: "all 0.2s ease",
                opacity: props.disabled || isLoading() ? 0.8 : 1,
                // 根据背景色动态生成投影
                "box-shadow":
                    isHovered() && !props.disabled
                        ? `0 2px 8px ${theme().bg}66`
                        : "none",
                ...(typeof local.style === "object" ? local.style : {}),
            }}
        >
            <Show when={local.icon && !isLoading()}>{local.icon}</Show>

            <span>
                {isLoading()
                    ? local.loadingText || "处理中..."
                    : local.children}
            </span>
        </button>
    );
};

export default StyledButton;
