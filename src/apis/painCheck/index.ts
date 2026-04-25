import Taro from "@tarojs/taro";
import { http } from "../request";
import {
  AnalyzeRequestBody,
  AnalyzeStreamEvent,
  CheckInPayload,
  CreateRecordPayload,
  PainCheckRecordDetail,
  PainCheckRecordSummary,
  PainPointPayload,
  RunnerProfilePayload,
} from "./types";

const BASE_URL = "https://lujiangc.com";

interface AnalyzeOptions {
  painPoints: PainPointPayload[];
  profile?: RunnerProfilePayload;
  onReasoning?: ({ content }: { content: string }) => void;
  onDelta?: ({ content }: { content: string }) => void;
  onDone?: () => void;
  onError?: ({ message }: { message: string }) => void;
}

interface AnalyzeHandle {
  abort: () => void;
}

interface ChunkEvent {
  data: ArrayBuffer;
}

interface ChunkRequestTask {
  abort?: () => void;
  onChunkReceived?: (cb: (res: ChunkEvent) => void) => void;
  onHeadersReceived?: (
    cb: (res: { header: Record<string, string> }) => void,
  ) => void;
}

/**
 * 纯 JS UTF-8 解码，部分基础库没有 TextDecoder。
 * 自动处理代理对（用于 emoji 等 4 字节字符）。
 */
const decodeUtf8 = ({ bytes }: { bytes: Uint8Array }): string => {
  let result = "";
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    if (b1 < 0x80) {
      result += String.fromCharCode(b1);
    } else if (b1 < 0xc0) {
      continue;
    } else if (b1 < 0xe0) {
      const b2 = bytes[i++] ?? 0;
      const code = ((b1 & 0x1f) << 6) | (b2 & 0x3f);
      result += String.fromCharCode(code);
    } else if (b1 < 0xf0) {
      const b2 = bytes[i++] ?? 0;
      const b3 = bytes[i++] ?? 0;
      const code =
        ((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      result += String.fromCharCode(code);
    } else {
      const b2 = bytes[i++] ?? 0;
      const b3 = bytes[i++] ?? 0;
      const b4 = bytes[i++] ?? 0;
      const code =
        ((b1 & 0x07) << 18) |
        ((b2 & 0x3f) << 12) |
        ((b3 & 0x3f) << 6) |
        (b4 & 0x3f);
      const cp = code - 0x10000;
      result += String.fromCharCode(
        0xd800 + (cp >> 10),
        0xdc00 + (cp & 0x3ff),
      );
    }
  }
  return result;
};

/**
 * 找到 \n\n 在字节序列中的位置（SSE 事件分隔）
 */
const findEventBoundary = ({
  bytes,
  from,
}: {
  bytes: Uint8Array;
  from: number;
}) => {
  for (let i = from; i < bytes.length - 1; i += 1) {
    if (bytes[i] === 0x0a && bytes[i + 1] === 0x0a) return i;
  }
  return -1;
};

const concatBytes = ({
  prev,
  next,
}: {
  prev: Uint8Array;
  next: Uint8Array;
}) => {
  const merged = new Uint8Array(prev.length + next.length);
  merged.set(prev, 0);
  merged.set(next, prev.length);
  return merged;
};

const parseSseLine = ({ line }: { line: string }): AnalyzeStreamEvent | null => {
  if (!line.startsWith("data:")) return null;
  const payload = line.slice(5).trim();
  if (!payload) return null;
  try {
    return JSON.parse(payload) as AnalyzeStreamEvent;
  } catch {
    return null;
  }
};

const analyze = ({
  painPoints,
  profile,
  onReasoning,
  onDelta,
  onDone,
  onError,
}: AnalyzeOptions): AnalyzeHandle => {
  const token = Taro.getStorageSync("token");
  if (!token) {
    onError?.({ message: "请先登录" });
    return { abort: () => {} };
  }

  const body: AnalyzeRequestBody = { painPoints, profile };
  let byteBuffer = new Uint8Array(0);
  let finished = false;

  const finish = ({ event }: { event: AnalyzeStreamEvent }) => {
    if (finished) return;
    finished = true;
    if (event.type === "done") onDone?.();
    else if (event.type === "error") onError?.({ message: event.message });
  };

  const consumeOneEvent = ({ blockBytes }: { blockBytes: Uint8Array }) => {
    const text = decodeUtf8({ bytes: blockBytes });
    for (const line of text.split("\n")) {
      const event = parseSseLine({ line: line.trim() });
      if (!event) continue;
      if (event.type === "reasoning") {
        onReasoning?.({ content: event.content });
      } else if (event.type === "delta") {
        onDelta?.({ content: event.content });
      } else if (event.type === "done" || event.type === "error") {
        finish({ event });
      }
    }
  };

  const drainBuffer = ({ tail }: { tail: boolean }) => {
    let cursor = 0;
    while (cursor < byteBuffer.length) {
      const idx = findEventBoundary({ bytes: byteBuffer, from: cursor });
      if (idx === -1) break;
      const blockBytes = byteBuffer.subarray(cursor, idx);
      if (blockBytes.length > 0) consumeOneEvent({ blockBytes });
      cursor = idx + 2;
    }
    byteBuffer = byteBuffer.subarray(cursor);
    if (tail && byteBuffer.length > 0) {
      consumeOneEvent({ blockBytes: byteBuffer });
      byteBuffer = new Uint8Array(0);
    }
  };

  const task = Taro.request({
    url: `${BASE_URL}/api/painCheck/analyze`,
    method: "POST",
    data: body as unknown as Record<string, unknown>,
    header: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    enableChunked: true,
    timeout: 120000,
    success: () => {
      drainBuffer({ tail: true });
      if (!finished) finish({ event: { type: "done" } });
    },
    fail: (err) => {
      const message =
        (err as { errMsg?: string }).errMsg || "网络异常，请稍后重试";
      finish({ event: { type: "error", message } });
    },
  } as Parameters<typeof Taro.request>[0]) as unknown as ChunkRequestTask;

  task.onChunkReceived?.((res) => {
    const next = new Uint8Array(res.data);
    byteBuffer = concatBytes({ prev: byteBuffer, next });
    drainBuffer({ tail: false });
  });

  return {
    abort: () => {
      if (finished) return;
      finished = true;
      task.abort?.();
    },
  };
};

const createRecord = (payload: CreateRecordPayload) =>
  http.post<{ id: string }>(
    "/api/painCheck/records",
    payload as unknown as Record<string, unknown>,
  );

const listRecords = (params?: { status?: "active" | "cured" | "expired" }) => {
  const query = params?.status ? `?status=${params.status}` : "";
  return http.get<PainCheckRecordSummary[]>(`/api/painCheck/records${query}`);
};

const getRecord = ({ id }: { id: string }) =>
  http.get<PainCheckRecordDetail>(`/api/painCheck/records/${id}`);

const deleteRecord = ({ id }: { id: string }) =>
  http.delete<{ id: string }>(`/api/painCheck/records/${id}`);

const cureRecord = ({ id }: { id: string }) =>
  http.post<{ id: string; status: string }>(
    `/api/painCheck/records/${id}/cure`,
  );

const checkIn = ({ id, payload }: { id: string; payload: CheckInPayload }) =>
  http.post<{
    id: string;
    subscribeQuota: number;
    reminderEnabled: boolean;
    remindTime: number;
    nextNotifyAt: string | null;
    lastCheckInAt: string | null;
  }>(
    `/api/painCheck/records/${id}/checkIn`,
    payload as unknown as Record<string, unknown>,
  );

const subscribe = ({
  id,
  accepted,
  remindTime,
}: {
  id: string;
  accepted: number;
  remindTime?: number;
}) =>
  http.post<{
    id: string;
    reminderEnabled: boolean;
    subscribeQuota: number;
    remindTime: number;
    nextNotifyAt: string | null;
  }>(`/api/painCheck/records/${id}/subscribe`, {
    accepted,
    ...(remindTime != null ? { remindTime } : {}),
  });

const setReminder = ({ id, enabled }: { id: string; enabled: boolean }) =>
  http.post<{ id: string; reminderEnabled: boolean }>(
    `/api/painCheck/records/${id}/reminder`,
    { enabled },
  );

export const painCheckApi = {
  analyze,
  createRecord,
  listRecords,
  getRecord,
  deleteRecord,
  cureRecord,
  checkIn,
  subscribe,
  setReminder,
};
