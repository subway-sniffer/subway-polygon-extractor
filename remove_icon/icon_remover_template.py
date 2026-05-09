import cv2
import numpy as np
import os

def remove_icons_by_template(img_path, icon_configs, base_dir):
    """
    템플릿 매칭을 사용하여 도면의 아이콘을 찾고 주변 배경으로 메웁니다.
    
    :param img_path: 원본 도면 이미지 경로
    :param icon_configs: 딕셔너리 형태의 {아이콘파일명: 일치도_임계값}
    :param base_dir: 아이콘 파일들이 위치한 기본 폴더 경로
    """
    img = cv2.imread(img_path)
    if img is None:
        print(f"❌ [Error] 도면 이미지를 찾을 수 없습니다: {img_path}")
        return None

    # 모든 아이콘의 위치를 덧그릴 빈 마스크(도화지) 생성
    mask = np.zeros(img.shape[:2], dtype=np.uint8)

    print("🔍 템플릿 매칭 기반 아이콘 탐색 시작...")
    
    for icon_name, thresh in icon_configs.items():
        template_path = os.path.join(base_dir, icon_name)
        template = cv2.imread(template_path)
        
        if template is None:
            print(f"⚠️ [Warning] {icon_name} 파일을 찾을 수 없어 건너뜁니다.")
            continue
            
        h, w = template.shape[:2]
        
        # 템플릿 매칭 연산
        res = cv2.matchTemplate(img, template, cv2.TM_CCOEFF_NORMED)
        loc = np.where(res >= thresh)
        
        # 찾은 위치를 마스크에 하얗게 칠하기
        count = 0
        for pt in zip(*loc[::-1]):
            cv2.rectangle(mask, pt, (pt[0] + w, pt[1] + h), 255, -1)
            count += 1
        
        print(f"  - {icon_name} (Thresh: {thresh}): {count}개 발견 및 마스킹 완료")

    # 생성된 마스크를 바탕으로 원본 이미지 복원(인페인팅)
    print("✨ 인페인팅(지우기) 연산 중...")
    cleaned_img = cv2.inpaint(img, mask, 3, cv2.INPAINT_TELEA)
    return cleaned_img


# ==========================================
if __name__ == "__main__":
    # 경로 설정 (현재 파일 기준)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    target_img_path = os.path.join(current_dir, 'isu.jpg') # 원본사진
    
    # 임계값 조절 : 높을수록 많이 지움
    CONFIGS = {
        'icon_blue.jpg': 0.8,
        'icon_blue_right.jpg': 0.8,
        'icon_red.jpg': 0.6,
        'icon_red_right.jpg': 0.6,
        'icon_4.jpg' : 0.5
    }

    result = remove_icons_by_template(target_img_path, CONFIGS, current_dir)
    
    if result is not None:
        cv2.imshow('Cleaned by Template', cv2.resize(result, (0,0), fx=0.5, fy=0.5))
        cv2.waitKey(0)
        cv2.destroyAllWindows()