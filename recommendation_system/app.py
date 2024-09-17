import numpy as np
import pandas as pd
videos = pd.read_csv('datasets/videos_data.csv')
videos.head(3)
def combine_and_split(row):
    combined_text = f"{row['title']} {row['description']} {row['categories']}"
    return combined_text.split()  


videos['tags'] = videos.apply(combine_and_split, axis=1)
#
videos['tags']
# new = videos.drop(columns=['description','','keywords','cast','crew'])
# new['tags'] = new['tags'].apply(lambda x: " ".join(x))
# new.head()
from sklearn.feature_extraction.text import CountVectorizer
cv = CountVectorizer(max_features=5000,stop_words='english')
videos['tags_str'] = videos['tags'].apply(lambda x: ' '.join(x) if isinstance(x, list) else x)
vector = cv.fit_transform(videos['tags_str']).toarray()
vector.shape
from sklearn.metrics.pairwise import cosine_similarity
similarity = cosine_similarity(vector)
similarity
def recommend(title):
    index = videos[videos['title'] == title].index[0]
    
    distances = sorted(list(enumerate(similarity[index])), reverse=True, key=lambda x: x[1])
    
    recommended_ids = []
    for i in distances[1:6]: 
        recommended_ids.append(videos.iloc[i[0]]['_id'])
    
    return recommended_ids

