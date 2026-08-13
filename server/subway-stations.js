const SUBWAY_LINES = [
  { id: '1', label: '1호선' },
  { id: '2', label: '2호선' },
  { id: '3', label: '3호선' },
  { id: '4', label: '4호선' },
  { id: '5', label: '5호선' },
  { id: '6', label: '6호선' },
  { id: '7', label: '7호선' },
  { id: '8', label: '8호선' },
  { id: '9', label: '9호선' },
  { id: '경의중앙', label: '경의중앙선' },
  { id: '수인분당', label: '수인분당선' },
  { id: '공항철도', label: '공항철도' },
  { id: '신분당', label: '신분당선' },
  { id: '우이신설', label: '우이신설선' },
  { id: '경춘', label: '경춘선' },
  { id: '김포골드', label: '김포골드라인' },
  { id: '서해', label: '서해선' },
];

// 서울시 지하철역 정보와 서울교통공사 노선도를 기준으로 구성한 대표 역 문제.
// 환승역은 해당 역이 속한 모든 노선 중 하나를 맞히면 정답으로 처리한다.
const SUBWAY_STATIONS = [
  { name: '종각', lines: ['1'] },
  { name: '신촌', lines: ['2'] },
  { name: '잠실나루', lines: ['2'] },
  { name: '신림', lines: ['2'] },
  { name: '혜화', lines: ['4'] },
  { name: '명동', lines: ['4'] },
  { name: '광화문', lines: ['5'] },
  { name: '화곡', lines: ['5'] },
  { name: '마포', lines: ['5'] },
  { name: '응암', lines: ['6'] },
  { name: '공릉', lines: ['7'] },
  { name: '송파', lines: ['8'] },
  { name: '신논현', lines: ['9'] },
  { name: '염창', lines: ['9'] },
  { name: '강남', lines: ['2', '신분당'] },
  { name: '선릉', lines: ['2', '수인분당'] },
  { name: '홍대입구', lines: ['2', '경의중앙', '공항철도'] },
  { name: '잠실', lines: ['2', '8'] },
  { name: '서울역', lines: ['1', '4', '경의중앙', '공항철도'] },
  { name: '시청', lines: ['1', '2'] },
  { name: '종로3가', lines: ['1', '3', '5'] },
  { name: '동대문역사문화공원', lines: ['2', '4', '5'] },
  { name: '왕십리', lines: ['2', '5', '경의중앙', '수인분당'] },
  { name: '고속터미널', lines: ['3', '7', '9'] },
  { name: '김포공항', lines: ['5', '9', '공항철도', '김포골드', '서해'] },
  { name: '노량진', lines: ['1', '9'] },
  { name: '동작', lines: ['4', '9'] },
  { name: '사당', lines: ['2', '4'] },
  { name: '이수', lines: ['4', '7'] },
  { name: '건대입구', lines: ['2', '7'] },
  { name: '교대', lines: ['2', '3'] },
  { name: '신도림', lines: ['1', '2'] },
  { name: '영등포구청', lines: ['2', '5'] },
  { name: '충무로', lines: ['3', '4'] },
  { name: '약수', lines: ['3', '6'] },
  { name: '불광', lines: ['3', '6'] },
  { name: '석계', lines: ['1', '6'] },
  { name: '태릉입구', lines: ['6', '7'] },
  { name: '온수', lines: ['1', '7'] },
  { name: '가락시장', lines: ['3', '8'] },
  { name: '모란', lines: ['8', '수인분당'] },
  { name: '복정', lines: ['8', '수인분당'] },
  { name: '청량리', lines: ['1', '경의중앙', '수인분당', '경춘'] },
  { name: '디지털미디어시티', lines: ['6', '경의중앙', '공항철도'] },
  { name: '합정', lines: ['2', '6'] },
];

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickSubwayQuestions(count = 10) {
  return shuffle(SUBWAY_STATIONS).slice(0, Math.min(count, SUBWAY_STATIONS.length));
}

module.exports = { SUBWAY_LINES, SUBWAY_STATIONS, pickSubwayQuestions };
