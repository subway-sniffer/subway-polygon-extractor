import cv2
import numpy as np
import os

# [수정 1] 실행 환경 에러 방지 (__file__이 없는 주피터 노트북 등 호환)
try:
    current_path = os.path.dirname(os.path.abspath(__file__))
except NameError:
    current_path = os.path.abspath('.') 

img = cv2.imread(os.path.join(current_path, 'isu.jpg'))
if img is None: exit("❌ 이미지를 찾을 수 없습니다. 파일명과 위치를 확인해주세요.")

hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# 1. 색상 범위 정의
lower_red1, upper_red1 = np.array([0, 100, 100]), np.array([10, 255, 255])
lower_red2, upper_red2 = np.array([160, 100, 100]), np.array([180, 255, 255])
lower_blue, upper_blue = np.array([100, 50, 50]), np.array([130, 255, 255])
lower_yellow, upper_yellow = np.array([20, 100, 100]), np.array([35, 255, 255])
lower_black, upper_black = np.array([0, 0, 0]), np.array([180, 255, 60])

# 2. 각 색상 마스크 생성
mask_r1 = cv2.inRange(hsv, lower_red1, upper_red1)
mask_r2 = cv2.inRange(hsv, lower_red2, upper_red2)

# [수정 2] 마스크 병합은 cv2.add 대신 cv2.bitwise_or 사용
mask_red = cv2.bitwise_or(mask_r1, mask_r2)
mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)
mask_yellow = cv2.inRange(hsv, lower_yellow, upper_yellow)
mask_black = cv2.inRange(hsv, lower_black, upper_black)

# 3. 모든 마스크 안전하게 합치기
total_mask = mask_red.copy()
total_mask = cv2.bitwise_or(total_mask, mask_blue)
total_mask = cv2.bitwise_or(total_mask, mask_yellow)
total_mask = cv2.bitwise_or(total_mask, mask_black)

# 4. 마스크 팽창 (노이즈 제거)
kernel = np.ones((3,3), np.uint8)
total_mask = cv2.dilate(total_mask, kernel, iterations=1)

# 5. 인페인팅 실행 (컴퓨터 사양에 따라 시간이 조금 걸릴 수 있습니다)
cleaned_img = cv2.inpaint(img, total_mask, 3, cv2.INPAINT_TELEA)

# 6. 결과 확인 (마스크가 어떻게 잡혔는지도 같이 띄워드립니다)
cv2.imshow('What will be erased (Mask)', cv2.resize(total_mask, (0,0), fx=0.5, fy=0.5))
cv2.imshow('Cleaned Result', cv2.resize(cleaned_img, (0,0), fx=0.5, fy=0.5))

cv2.waitKey(0)
cv2.destroyAllWindows()