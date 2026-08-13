// CS knowledge quiz bank — multiple choice, answerIndex is 0-based.
const CS_QUESTIONS = [
  { question: 'TCP와 UDP의 차이로 옳은 것은?', choices: ['TCP는 비연결형, UDP는 연결형이다', 'TCP는 신뢰성 보장, UDP는 보장하지 않는다', 'UDP만 흐름제어를 지원한다', '둘 다 동일한 헤더 크기를 가진다'], answerIndex: 1 },
  { question: '시간복잡도 O(n log n)을 가지는 정렬 알고리즘은?', choices: ['버블 정렬', '삽입 정렬', '병합 정렬', '선택 정렬'], answerIndex: 2 },
  { question: 'HTTP 상태 코드 404의 의미는?', choices: ['서버 오류', '권한 없음', '찾을 수 없음', '리다이렉트'], answerIndex: 2 },
  { question: '프로세스와 스레드의 차이로 옳은 것은?', choices: ['스레드는 독립된 메모리 공간을 가진다', '프로세스 간에는 메모리를 공유하지 않는 것이 기본이다', '스레드는 프로세스보다 생성 비용이 크다', '한 프로세스는 하나의 스레드만 가질 수 있다'], answerIndex: 1 },
  { question: '관계형 데이터베이스에서 기본키(Primary Key)의 특징이 아닌 것은?', choices: ['NULL을 허용하지 않는다', '테이블 내에서 유일하다', '여러 개 지정할 수 있다', '레코드를 고유하게 식별한다'], answerIndex: 2 },
  { question: '스택(Stack) 자료구조의 특징은?', choices: ['FIFO', 'LIFO', '우선순위 기반', '랜덤 접근'], answerIndex: 1 },
  { question: 'REST API에서 리소스를 생성할 때 사용하는 HTTP 메서드는?', choices: ['GET', 'POST', 'DELETE', 'HEAD'], answerIndex: 1 },
  { question: '운영체제의 교착상태(Deadlock) 발생 조건이 아닌 것은?', choices: ['상호 배제', '점유와 대기', '선점 가능', '순환 대기'], answerIndex: 2 },
  { question: '이진 탐색(Binary Search)의 시간복잡도는?', choices: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'], answerIndex: 1 },
  { question: 'CSS에서 요소를 화면에 표시하지 않으면서 공간도 차지하지 않게 하는 속성은?', choices: ['visibility: hidden', 'opacity: 0', 'display: none', 'z-index: -1'], answerIndex: 2 },
  { question: 'Git에서 커밋 이력을 조작하지 않고 특정 커밋의 변경사항만 취소하는 명령은?', choices: ['git reset', 'git revert', 'git rebase', 'git checkout'], answerIndex: 1 },
  { question: '데이터베이스 정규화의 주 목적은?', choices: ['조회 속도 향상', '데이터 중복 최소화', '저장 공간 증가', '인덱스 자동 생성'], answerIndex: 1 },
  { question: '자바스크립트에서 클로저(Closure)란?', choices: ['비동기 함수의 일종', '함수가 자신이 선언된 렉시컬 스코프를 기억하는 것', '클래스 상속 방식', '메모리 해제 기법'], answerIndex: 1 },
  { question: 'HTTPS가 HTTP와 다른 점은?', choices: ['포트 번호가 같다', 'TLS/SSL로 암호화한다', '항상 더 빠르다', '캐싱을 지원하지 않는다'], answerIndex: 1 },
  { question: '캐시 무효화 전략 중 가장 오래된 데이터를 먼저 제거하는 방식은?', choices: ['LRU', 'FIFO', 'LFU', 'MRU'], answerIndex: 1 },
  { question: 'B-Tree 인덱스를 주로 사용하는 이유는?', choices: ['정렬이 필요 없어서', '디스크 I/O를 줄여 탐색 성능을 높이기 위해', '메모리 사용을 늘리기 위해', '삽입 속도를 늦추기 위해'], answerIndex: 1 },
  { question: 'HTTP 메서드 중 서버 상태를 변경하지 않아야 하는(멱등하고 안전한) 것은?', choices: ['POST', 'PATCH', 'GET', 'PUT'], answerIndex: 2 },
  { question: '재귀 함수가 무한히 반복될 때 발생하는 오류는?', choices: ['Segmentation Fault만 발생', 'Stack Overflow', 'Heap Overflow', 'Null Pointer Exception'], answerIndex: 1 },
  { question: '컴파일 언어와 인터프리터 언어의 차이는?', choices: ['컴파일 언어는 실행 전에 기계어로 변환된다', '인터프리터 언어는 실행 속도가 항상 더 빠르다', '컴파일 언어는 타입이 없다', '차이가 없다'], answerIndex: 0 },
  { question: '해시 테이블(Hash Table)의 평균 탐색 시간복잡도는?', choices: ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'], answerIndex: 2 },
  { question: 'CORS(Cross-Origin Resource Sharing)가 필요한 이유는?', choices: ['서버 성능 향상을 위해', '다른 출처 간 리소스 요청을 브라우저가 안전하게 허용하기 위해', 'DB 접근 속도를 높이기 위해', 'CSS 로딩을 빠르게 하기 위해'], answerIndex: 1 },
  { question: '가상 메모리(Virtual Memory)를 사용하는 주 목적은?', choices: ['CPU 속도 향상', '실제 물리 메모리보다 큰 주소 공간을 프로세스에 제공', '네트워크 지연 감소', '컴파일 시간 단축'], answerIndex: 1 },
  { question: '큐(Queue) 자료구조의 특징은?', choices: ['LIFO', 'FIFO', '트리 기반', '해시 기반'], answerIndex: 1 },
  { question: '소프트웨어 설계에서 SOLID 원칙 중 "S"가 의미하는 것은?', choices: ['Single Responsibility', 'Scalability', 'Simplicity', 'Security'], answerIndex: 0 },
  { question: 'DNS의 주 역할은?', choices: ['IP 주소를 도메인 이름으로/도메인 이름을 IP 주소로 변환', '파일 전송', '이메일 발송', '암호화 통신'], answerIndex: 0 },
  { question: '동시성 문제를 해결하기 위해 임계 구역(critical section)에 사용하는 것은?', choices: ['뮤텍스(Mutex)', '캐시', '레지스터', '스택 포인터'], answerIndex: 0 },
  { question: 'JOIN 없이 두 테이블의 데이터를 합칠 때 컬럼 개수와 타입이 같아야 하는 SQL 연산자는?', choices: ['UNION', 'WHERE', 'GROUP BY', 'HAVING'], answerIndex: 0 },
  { question: '빅오 표기법에서 최악의 경우 성능을 나타내는 것은?', choices: ['평균 케이스', '최선 케이스', '최악 케이스', '상수 케이스'], answerIndex: 2 },
];

function pickRandomQuestions(count) {
  const shuffled = [...CS_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports = { CS_QUESTIONS, pickRandomQuestions };
