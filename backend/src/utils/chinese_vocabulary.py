import json
import requests
from bs4 import BeautifulSoup
import os

# 常用5000汉字列表
common_chars = "的一了是我不人在有他这为之大来以个中上们到说去子要也出得就你和着没有看好自己这会那可下而你我他她它要在来会有出大就好去了个上们也子说生道对进着没看起过天反物实小朋力发理当所使学数者条事向题解问义情者地制行因然种同进动机把后应处将住听但现候正全明名想定成只如工变建意日特提看建想义现日解问情地制行因然种同进动机把后应处将住听但现候正全明名想定成只如工变建意日特提看建想义现日解问情地制行因然种同进动机把后应处将住听但现候正全明名想定成只如工变建意日特提"

# 扩展常用汉字列表（从网络抓取）
extended_chars = []

# 抓取常用汉字
print("开始抓取常用汉字...")
try:
    response = requests.get("https://www.zdic.net/zd/zb/cc1/")
    if response.status_code == 200:
        soup = BeautifulSoup(response.content, 'html.parser')
        # 提取页面中的汉字
        chars = soup.find_all('a', class_='zis')
        for char in chars[:1000]:  # 只取前1000个
            extended_chars.append(char.text)
        print(f"成功抓取 {len(extended_chars)} 个汉字")
except Exception as e:
    print(f"抓取汉字失败: {e}")

# 合并并去重
all_chars = list(set(common_chars + ''.join(extended_chars)))
print(f"总共有 {len(all_chars)} 个汉字")

# 为每个汉字生成基本信息
def get_char_info(char):
    info = {
        "char": char,
        "pinyin": [],
        "meaning": [],
        "examples": []
    }
    
    # 尝试从网络获取汉字信息
    try:
        response = requests.get(f"https://www.zdic.net/hans/{char}")
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 提取拼音
            pinyin_elements = soup.find_all('span', class_='pinyin')
            for pinyin in pinyin_elements:
                info["pinyin"].append(pinyin.text.strip())
            
            # 提取释义
            meaning_elements = soup.find_all('div', class_='content')
            for meaning in meaning_elements:
                text = meaning.text.strip()
                if text and len(text) < 500:  # 限制长度
                    info["meaning"].append(text)
            
            # 提取示例
            example_elements = soup.find_all('div', class_='example')
            for example in example_elements[:3]:  # 只取前3个
                text = example.text.strip()
                if text and len(text) < 200:  # 限制长度
                    info["examples"].append(text)
    except Exception as e:
        print(f"获取汉字 {char} 信息失败: {e}")
    
    return info

# 生成词汇数据库
print("开始生成词汇数据库...")
vocabulary_db = []
for i, char in enumerate(all_chars[:5000]):  # 限制在5000字以内
    if i % 100 == 0:
        print(f"处理中: {i}/{min(len(all_chars), 5000)}")
    info = get_char_info(char)
    vocabulary_db.append(info)

# 保存数据库
output_dir = "c:\RUANLINYUN\ruanlinyun-assistant\backend\src\data"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

with open(os.path.join(output_dir, "chinese_vocabulary.json"), "w", encoding="utf-8") as f:
    json.dump(vocabulary_db, f, ensure_ascii=False, indent=2)

print("词汇数据库生成完成！")
print(f"共包含 {len(vocabulary_db)} 个汉字")
