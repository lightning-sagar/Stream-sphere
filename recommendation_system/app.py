import pickle

movies = pickle.load(open('recommendation_system/model/movie_list.pkl', 'rb'))
similarity = pickle.load(open('recommendation_system/model/similarity.pkl', 'rb'))

print("Movies List:")
print(movies[title])

print("\nSimilarity Matrix:")
print(similarity)
pandas numpy scikit-learn pickle jupiter
ipynb -> python -m notebook
