import { View, Text, ScrollView, Picker } from "@tarojs/components";
import Taro, { useDidShow, useRouter } from "@tarojs/taro";
import { useState } from "react";
import { painCheckApi } from "../../apis/painCheck";
import type {
  PainCheckRecordDetail,
  RecoverySeverity,
} from "../../apis/painCheck/types";
import {
  DEFAULT_REMIND_TIME,
  REMIND_TIME_OPTIONS,
  formatRemindTime,
  remindTimeFromIndex,
  remindTimeToIndex,
} from "../../utils/remindTime";
import { parseMarkdown, stripInline } from "../../utils/markdown";
import "./index.scss";

const TEMPLATE_ID = "r6Mg96WyISh0jUGySUSC0eJ2W2uR6csoSNMyI8i4rvU";

const SEVERITY_LABEL: Record<RecoverySeverity, string> = {
  mild: "轻度",
  moderate: "中度",
  severe: "重度",
};

const STATUS_LABEL: Record<string, string> = {
  active: "跟踪中",
  cured: "已痊愈",
  expired: "已结束",
};

const formatDate = ({ raw }: { raw: string | null | undefined }) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
};

const formatTime = ({ raw }: { raw: string | null | undefined }) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate({ raw })} ${h}:${min}`;
};

const isToday = ({ raw }: { raw: string | null | undefined }) => {
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const PainCheckRecord = () => {
  const router = useRouter();
  const recordId = router.params.id || "";
  const [detail, setDetail] = useState<PainCheckRecordDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [pendingRemindTime, setPendingRemindTime] =
    useState<number>(DEFAULT_REMIND_TIME);
  const [reportOpen, setReportOpen] = useState(false);

  const fetchDetail = async () => {
    if (!recordId) return;
    setLoading(true);
    try {
      const data = await painCheckApi.getRecord({ id: recordId });
      setDetail(data);
      setPendingRemindTime(data.remindTime);
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    void fetchDetail();
  });

  const requestSubscribe = async () => {
    const subRes = await (Taro.requestSubscribeMessage as unknown as (
      opts: { tmplIds: string[] },
    ) => Promise<Record<string, string>>)({
      tmplIds: [TEMPLATE_ID],
    });
    return subRes[TEMPLATE_ID] === "accept" ? 1 : 0;
  };

  const handleCheckIn = async () => {
    if (!detail || actionBusy) return;
    setActionBusy(true);
    try {
      let accepted = 0;
      try {
        accepted = await requestSubscribe();
      } catch {
        accepted = 0;
      }
      await painCheckApi.checkIn({
        id: detail.id,
        payload: {
          completedItems: detail.planItems.map((p) => p.title),
          subscribeAccepted: accepted,
          remindTime: pendingRemindTime,
        },
      });
      Taro.showToast({
        title: accepted > 0 ? "打卡成功，下次提醒已续上" : "打卡成功",
        icon: "success",
      });
      await fetchDetail();
    } catch (err) {
      const message = err instanceof Error ? err.message : "打卡失败";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      setActionBusy(false);
    }
  };

  const handleEnableReminder = async () => {
    if (!detail || actionBusy) return;
    setActionBusy(true);
    try {
      const accepted = await requestSubscribe();
      if (accepted <= 0) {
        Taro.showToast({ title: "未授权订阅", icon: "none" });
        return;
      }
      await painCheckApi.subscribe({
        id: detail.id,
        accepted,
        remindTime: pendingRemindTime,
      });
      Taro.showToast({ title: "提醒已开启", icon: "success" });
      await fetchDetail();
    } catch (err) {
      const message = err instanceof Error ? err.message : "开启失败";
      Taro.showToast({ title: message, icon: "none" });
    } finally {
      setActionBusy(false);
    }
  };

  const handleDisableReminder = async () => {
    if (!detail) return;
    const confirmRes = await Taro.showModal({
      title: "关闭提醒？",
      content: "关闭后下一次不会再发送微信提醒。",
    });
    if (!confirmRes.confirm) return;
    await painCheckApi.setReminder({ id: detail.id, enabled: false });
    Taro.showToast({ title: "已关闭提醒", icon: "success" });
    await fetchDetail();
  };

  const handleCure = async () => {
    if (!detail) return;
    const confirmRes = await Taro.showModal({
      title: "标记为痊愈？",
      content: "确认后将停止提醒并归档。",
    });
    if (!confirmRes.confirm) return;
    await painCheckApi.cureRecord({ id: detail.id });
    Taro.showToast({ title: "已标记痊愈", icon: "success" });
    await fetchDetail();
  };

  const handleDelete = async () => {
    if (!detail) return;
    const confirmRes = await Taro.showModal({
      title: "删除该记录？",
      content: "删除后无法恢复。",
    });
    if (!confirmRes.confirm) return;
    await painCheckApi.deleteRecord({ id: detail.id });
    Taro.showToast({ title: "已删除", icon: "success" });
    setTimeout(() => Taro.navigateBack(), 600);
  };

  if (!recordId) {
    return (
      <View className="page-record">
        <View className="record-empty">缺少记录 ID</View>
      </View>
    );
  }

  if (loading && !detail) {
    return (
      <View className="page-record">
        <View className="record-empty">加载中…</View>
      </View>
    );
  }

  if (!detail) {
    return (
      <View className="page-record">
        <View className="record-empty">记录不存在或已删除</View>
      </View>
    );
  }

  const todayChecked = detail.checkIns.some((c) =>
    isToday({ raw: c.checkInDate }),
  );
  const isActive = detail.status === "active";

  return (
    <View className="page-record">
      <ScrollView scrollY className="record-scroll">
        <View className="record-hero">
          <View className="record-hero__row">
            <Text className="record-hero__title">{detail.diagnosisLabel}</Text>
            <Text
              className={`record-hero__severity record-hero__severity--${detail.severity}`}
            >
              {SEVERITY_LABEL[detail.severity]}
            </Text>
          </View>
          <View className="record-hero__meta">
            <Text className="record-hero__meta-item">
              {STATUS_LABEL[detail.status] || detail.status}
            </Text>
            <Text className="record-hero__meta-item">
              · 跟踪 {detail.durationDays} 天
            </Text>
            <Text className="record-hero__meta-item">
              · 创建 {formatDate({ raw: detail.createdAt })}
            </Text>
          </View>
          <View className="record-hero__actions">
            {isActive && (
              <View
                className="record-hero__action"
                onClick={handleCure}
              >
                <Text>标记为已痊愈</Text>
              </View>
            )}
            <View
              className="record-hero__action record-hero__action--danger"
              onClick={handleDelete}
            >
              <Text>删除记录</Text>
            </View>
          </View>
        </View>

        {isActive && detail.suggestRecovery && detail.planItems.length > 0 && (
          <View className="record-block">
            <View className="record-block__head">
              <Text className="record-block__title">
                今日打卡 {todayChecked ? "（已完成）" : ""}
              </Text>
              {detail.reminderEnabled ? (
                <Text className="record-block__sub">
                  下次提醒 {formatTime({ raw: detail.nextNotifyAt })}
                </Text>
              ) : (
                <Text className="record-block__sub">未开启提醒</Text>
              )}
            </View>
            <Text className="record-block__hint">
              动作不明白可按名称去搜视频跟练
            </Text>
            {detail.planItems.map((item) => (
              <View key={item.title} className="plan-row">
                <View className="plan-row__bullet" />
                <View className="plan-row__main">
                  <Text className="plan-row__title">{item.title}</Text>
                  <Text className="plan-row__meta">
                    每天 {item.frequencyPerDay} 次
                    {item.duration ? ` · ${item.duration}` : ""}
                  </Text>
                  {item.note && (
                    <Text className="plan-row__note">{item.note}</Text>
                  )}
                </View>
              </View>
            ))}

            <View className="record-actions">
              <Picker
                mode="selector"
                range={REMIND_TIME_OPTIONS}
                value={remindTimeToIndex({ minutes: pendingRemindTime })}
                onChange={(e) => {
                  const idx = Number(e.detail.value);
                  setPendingRemindTime(remindTimeFromIndex({ index: idx }));
                }}
              >
                <View className="record-btn record-btn--ghost record-btn--time">
                  <Text>
                    {formatRemindTime({ minutes: pendingRemindTime })}
                    {" ›"}
                  </Text>
                </View>
              </Picker>
              <View
                className={`record-btn record-btn--primary ${actionBusy ? "record-btn--disabled" : ""}`}
                onClick={handleCheckIn}
              >
                <Text>
                  {todayChecked ? "再次打卡 / 续订提醒" : "完成今日打卡"}
                </Text>
              </View>
            </View>
            {!detail.reminderEnabled && (
              <View
                className={`record-btn record-btn--ghost record-btn--full ${actionBusy ? "record-btn--disabled" : ""}`}
                onClick={handleEnableReminder}
              >
                {actionBusy && <View className="spinner spinner--dark" />}
                <Text>开启微信提醒</Text>
              </View>
            )}
            {detail.reminderEnabled && (
              <View
                className="record-btn record-btn--ghost record-btn--full"
                onClick={handleDisableReminder}
              >
                <Text>关闭提醒</Text>
              </View>
            )}
            {detail.reminderEnabled &&
              pendingRemindTime !== detail.remindTime && (
                <Text className="record-tip">
                  时间已修改，下次打卡后生效。
                </Text>
              )}
            <Text className="record-tip">
              微信订阅消息每次只能发送一次，需进入小程序点击「打卡」续订下次提醒，否则到期自动归档为已结束。
            </Text>
          </View>
        )}

        {detail.checkIns.length > 0 && (
          <View className="record-block">
            <Text className="record-block__title">打卡记录</Text>
            {detail.checkIns.map((c) => (
              <View key={c.id} className="check-row">
                <Text className="check-row__date">
                  {formatDate({ raw: c.checkInDate })}
                </Text>
                <Text className="check-row__items">
                  {Array.isArray(c.completedItems) && c.completedItems.length > 0
                    ? c.completedItems.join("、")
                    : "全部完成"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="record-block">
          <View
            className="record-block__head record-block__head--clickable"
            onClick={() => setReportOpen((v) => !v)}
          >
            <Text className="record-block__title">AI 分析报告</Text>
            <Text className="record-block__sub">
              {reportOpen ? "收起 ›" : "展开 ›"}
            </Text>
          </View>
          {reportOpen && (
            <View className="record-report">
              {parseMarkdown({ text: detail.reportText }).map((block, idx) => {
                const content = stripInline({ text: block.content });
                if (block.type === "h1")
                  return (
                    <Text key={idx} className="report-md__h1">
                      {content}
                    </Text>
                  );
                if (block.type === "h2")
                  return (
                    <Text key={idx} className="report-md__h2">
                      {content}
                    </Text>
                  );
                if (block.type === "h3")
                  return (
                    <Text key={idx} className="report-md__h3">
                      {content}
                    </Text>
                  );
                if (block.type === "li")
                  return (
                    <View key={idx} className="report-md__li">
                      <View className="report-md__li-dot" />
                      <Text className="report-md__li-text" selectable>
                        {content}
                      </Text>
                    </View>
                  );
                if (block.type === "hr")
                  return <View key={idx} className="report-md__hr" />;
                if (block.type === "em")
                  return (
                    <Text key={idx} className="report-md__em">
                      {content}
                    </Text>
                  );
                if (!content) {
                  return <View key={idx} className="report-md__br" />;
                }
                return (
                  <Text key={idx} className="report-md__p" selectable>
                    {content}
                  </Text>
                );
              })}
            </View>
          )}
        </View>

        <View className="record-block">
          <Text className="record-block__title">疼痛点</Text>
          {detail.painPoints.map((p, idx) => (
            <View key={idx} className="point-row">
              <Text className="point-row__name">
                {p.anatomicalSide === "left"
                  ? "左"
                  : p.anatomicalSide === "right"
                    ? "右"
                    : ""}
                {p.muscleName}
                {p.subMuscles && p.subMuscles.length > 0
                  ? ` · ${p.subMuscles.join("、")}`
                  : ""}
              </Text>
              <Text className="point-row__meta">
                {p.painType} · {p.severity}/10
                {p.triggers.length > 0 ? ` · ${p.triggers.join("、")}` : ""}
              </Text>
              {p.notes && <Text className="point-row__notes">{p.notes}</Text>}
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
};

export default PainCheckRecord;
