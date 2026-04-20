export interface BiliVideoConfig {
    opRanges: TimeRange[]; // 跳过列表
    frameConfig: TimePoint; // 帧分析点
    jumpConfig: TimePoint; // 手动切集点
    mode: "auto" | "manual"; // 当前模式
}

export interface HistoryItem extends BiliVideoConfig {
    id: number;
    title: string;
    url: string;
    time: number;
}

export interface TimePoint {
    h: number; // 小时
    m: number; // 分钟
    s: number; // 秒
}

export interface TimeRange {
    id: string; // 唯一标识，用于列表渲染和删除逻辑
    start: TimePoint; // 起始时间
    end: TimePoint; // 结束时间
}

export interface TimeRangeManagerProps {
    ranges: TimeRange[];
    onUpdate: (newList: TimeRange[]) => void;
    onClose: () => void;
}
