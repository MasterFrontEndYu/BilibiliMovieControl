export interface VideoConfig {
    sH: number;
    sM: number;
    sS: number;
    mH: number;
    mM: number;
    mS: number;
    eH: number;
    eM: number;
    eS: number;
}

export interface HistoryItem {
    title: string;
    url: string;
    time: number;
    config: VideoConfig;
}

