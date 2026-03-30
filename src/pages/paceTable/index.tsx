import { View, Text, Picker } from '@tarojs/components';
import { useMemo, useState } from 'react';
import './index.scss';

const HALF_MARATHON_KM = 21.0975;
const FULL_MARATHON_KM = 42.195;

const PROJECTS = [
  { label: '全马 42.195km', km: FULL_MARATHON_KM },
  { label: '半马 21.097km', km: HALF_MARATHON_KM },
  { label: '10K', km: 10 },
  { label: '5K', km: 5 },
];

const HOURS = Array.from({ length: 10 }, (_, i) => `${i}时`);
const MINUTES = Array.from({ length: 60 }, (_, i) => `${String(i).padStart(2, '0')}分`);
const SECONDS = Array.from({ length: 60 }, (_, i) => `${String(i).padStart(2, '0')}秒`);

const formatTime = ({ totalSeconds }: { totalSeconds: number }) => {
  const rounded = Math.round(totalSeconds);
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatPace = ({ seconds }: { seconds: number }) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const generatePaceData = () => {
  const paces: number[] = [];
  for (let s = 172; s <= 603; s += 3) {
    paces.push(s);
  }
  return paces.map((p) => ({
    pace: formatPace({ seconds: p }),
    fiveK: formatTime({ totalSeconds: p * 5 }),
    tenK: formatTime({ totalSeconds: p * 10 }),
    half: formatTime({ totalSeconds: p * HALF_MARATHON_KM }),
    full: formatTime({ totalSeconds: p * FULL_MARATHON_KM }),
  }));
};

const PaceTable = () => {
  const data = useMemo(generatePaceData, []);
  const [projectIdx, setProjectIdx] = useState(0);
  const [timeIdx, setTimeIdx] = useState([4, 0, 0]);
  const [result, setResult] = useState('');

  const handleCalc = () => {
    const totalSec = timeIdx[0] * 3600 + timeIdx[1] * 60 + timeIdx[2];
    if (totalSec <= 0) return;
    const km = PROJECTS[projectIdx].km;
    const paceSeconds = totalSec / km;
    setResult(formatPace({ seconds: Math.round(paceSeconds) }));
  };

  const timeDisplay = `${timeIdx[0]}时${String(timeIdx[1]).padStart(2, '0')}分${String(timeIdx[2]).padStart(2, '0')}秒`;

  return (
    <View className="page-pace">
      <View className="calc-section">
        <View className="calc-row">
          <View className="calc-picker-wrap">
            <Picker
              mode="selector"
              range={PROJECTS.map((p) => p.label)}
              value={projectIdx}
              onChange={(e) => setProjectIdx(Number(e.detail.value))}
            >
              <View className="calc-picker">
                <Text className="calc-picker__text">{PROJECTS[projectIdx].label}</Text>
                <Text className="calc-picker__arrow">▼</Text>
              </View>
            </Picker>
          </View>

          <View className="calc-picker-wrap">
            <Picker
              mode="multiSelector"
              range={[HOURS, MINUTES, SECONDS]}
              value={timeIdx}
              onChange={(e) => setTimeIdx(e.detail.value.map(Number))}
              onColumnChange={() => {}}
            >
              <View className="calc-picker">
                <Text className="calc-picker__text">{timeDisplay}</Text>
                <Text className="calc-picker__arrow">▼</Text>
              </View>
            </Picker>
          </View>

          <View className="calc-btn" onClick={handleCalc}>
            <Text className="calc-btn__text">计算</Text>
          </View>
        </View>

        {result && (
          <View className="calc-result">
            <Text className="calc-result__label">目标配速</Text>
            <Text className="calc-result__value">{result}</Text>
            <Text className="calc-result__unit">/km</Text>
          </View>
        )}
      </View>

      <View className="pace-table">
        <View className="pace-row pace-row--header">
          <Text className="pace-cell pace-cell--pace pace-cell--header">配速</Text>
          <Text className="pace-cell pace-cell--header">5公里</Text>
          <Text className="pace-cell pace-cell--header">10公里</Text>
          <Text className="pace-cell pace-cell--header">半马</Text>
          <Text className="pace-cell pace-cell--header">马拉松</Text>
        </View>
        {data.map((row) => (
          <View key={row.pace} className="pace-row">
            <Text className="pace-cell pace-cell--pace">{row.pace}</Text>
            <Text className="pace-cell">{row.fiveK}</Text>
            <Text className="pace-cell">{row.tenK}</Text>
            <Text className="pace-cell">{row.half}</Text>
            <Text className="pace-cell">{row.full}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default PaceTable;
