import { View, Text, ScrollView } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useState } from "react";
import { painCheckApi } from "../../apis/painCheck";
import type {
  PainCheckRecordSummary,
  RecoverySeverity,
} from "../../apis/painCheck/types";
import "./index.scss";

const STATUS_TABS: { key: "active" | "cured" | "expired" | "all"; label: string }[] = [
  { key: "active", label: "跟踪中" },
  { key: "cured", label: "已痊愈" },
  { key: "expired", label: "已结束" },
  { key: "all", label: "全部" },
];

const SEVERITY_LABEL: Record<RecoverySeverity, string> = {
  mild: "轻度",
  moderate: "中度",
  severe: "重度",
};

const formatDate = ({ raw }: { raw: string | null }) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const formatDateTime = ({ raw }: { raw: string | null }) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${h}:${min}`;
};

const PainCheckRecords = () => {
  const [tab, setTab] = useState<"active" | "cured" | "expired" | "all">(
    "active",
  );
  const [records, setRecords] = useState<PainCheckRecordSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecords = async ({
    status,
  }: {
    status: "active" | "cured" | "expired" | "all";
  }) => {
    setLoading(true);
    try {
      const list = await painCheckApi.listRecords({
        status: status === "all" ? undefined : status,
      });
      setRecords(list);
    } catch {
      // 失败时由全局拦截器 toast，无需重复
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    void fetchRecords({ status: tab });
  });

  const handleTab = ({
    next,
  }: {
    next: "active" | "cured" | "expired" | "all";
  }) => {
    setTab(next);
    void fetchRecords({ status: next });
  };

  const handleOpen = ({ id }: { id: string }) => {
    Taro.navigateTo({ url: `/pages/painCheckRecord/index?id=${id}` });
  };

  return (
    <View className="page-records">
      <View className="records-tabs">
        {STATUS_TABS.map((t) => (
          <View
            key={t.key}
            className={`records-tab ${tab === t.key ? "records-tab--active" : ""}`}
            onClick={() => handleTab({ next: t.key })}
          >
            <Text>{t.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className="records-scroll">
        {loading && records.length === 0 && (
          <View className="records-empty">
            <Text>加载中…</Text>
          </View>
        )}
        {!loading && records.length === 0 && (
          <View className="records-empty">
            <Text>暂无记录</Text>
          </View>
        )}
        {records.map((r) => (
          <View
            key={r.id}
            className="record-card"
            onClick={() => handleOpen({ id: r.id })}
          >
            <View className="record-card__head">
              <Text className="record-card__title">{r.diagnosisLabel}</Text>
              <Text
                className={`record-card__severity record-card__severity--${r.severity}`}
              >
                {SEVERITY_LABEL[r.severity]}
              </Text>
            </View>
            <View className="record-card__meta">
              <Text className="record-card__meta-item">
                创建 {formatDate({ raw: r.createdAt })}
              </Text>
              <Text className="record-card__meta-item">
                · 跟踪 {r.durationDays} 天
              </Text>
              {r.lastCheckInAt && (
                <Text className="record-card__meta-item">
                  · 上次打卡 {formatDate({ raw: r.lastCheckInAt })}
                </Text>
              )}
            </View>
            <View className="record-card__footer">
              {r.status === "active" && r.reminderEnabled && (
                <Text className="record-card__tag record-card__tag--remind">
                  下次提醒 {formatDateTime({ raw: r.nextNotifyAt })}
                </Text>
              )}
              {r.status === "active" && !r.reminderEnabled && (
                <Text className="record-card__tag">未开启提醒</Text>
              )}
              {r.status === "cured" && (
                <Text className="record-card__tag record-card__tag--cured">
                  已痊愈
                </Text>
              )}
              {r.status === "expired" && (
                <Text className="record-card__tag record-card__tag--expired">
                  已结束（超期未打卡）
                </Text>
              )}
              <Text className="record-card__arrow">›</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default PainCheckRecords;
