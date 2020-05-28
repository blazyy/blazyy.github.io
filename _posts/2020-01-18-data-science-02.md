---
permalink: /data-science-02
title: "Using Foursquare API to analyze Chennai's neighborhoods"
header:
  teaser: /assets/images/thumbnails/neighborhood.jpg
comments: true
excerpt: "A post on how I analyzed various neighbourhoods in Chennai using the Foursquare API to find which neighbourhood you should live in if you love food."
date: Jan 18th, 2020
---

<style>
  .center-image{
      margin: 0 auto;
      display: block;
  }
</style>

As part of a course I'm doing on Coursera, I am supposed to write a blog post for my final project. What better platform to do that other than your own website?

The certification course is called the IBM Data Science Professional Certification. While it is a great starter course, I found it to be to great in width and very low in depth. I would recommend it to most who have no knowledge of data science.

Anyway, here's the content.

# The Project

The final capstone project is called 'Battle of the Neighborhoods'. Here's what the instructions say:

> Now that you have been equipped with the skills and the tools to use location data to explore a geographical location, over the course of two weeks, you will have the opportunity to be as creative as you want and come up with an idea to leverage the Foursquare location data to explore or compare neighborhoods or cities of your choice or to come up with a problem that you can use the Foursquare location data to solve. 

I am supposed to use the Foursquare API (a location based service), in order to get location data and use it to compare different neighborhoods and use it to solve a problem. I came up with a very trivial problem since I was short on time (since Coursera works on a monthly subsription basis and I didn't want to pay any more). However in the future I will come up with an actual problem that needs to be solved.

# The (Fake) Preamble

Mr. Nolan is going to be moving in to the city of Chennai, located at the south edge of the Indian subcontinent. He needs to find suitable housing. However, he frets. He doesn't worry about the locality one bit; except the fulfillment of one condition: there needs to be a lot of restaurants/food stalls nearby. You see, Mr. Nolan is a foodie. Not a day goes by where he does not make or savour a new dish. He has come to me for help, asking me to analyze the different areas in the city of Chennai and find which neighborhoods would be the best for a foodie like him to move in to. Me, being the perfect philanthropist as I am, have decided to help Mr. Nolan using a bit of data and a bit of science.

# Introduction

The aim here is to find neighborhoods with a high frequency of restaurants/food stalls/cafés. Firstly, the number of neighborhoods and their respective coordinates need to be retrieved, so that Foursquare can find nearby venues. The preferred method is using the `geopy` package but for some reason, it did not work here. So I used `urllib` and `bs4` to get the coordinates. Using this data, Foursquare should be used to search for nearby venues and get their categories.

These venues are then clustered using k-means. The cluster in which eateries are of the highest frequency will be the set of neighborhoods we are looking for. All of these neighborhoods would be suitable for Mr.Nolan to move in. This problem can also be easily extended to fit other requests, such as finding the neighborhoods with low real estate prices, neighborhoods with a wide variety of grocery shops, neighborhoods closest to public transportation systems, etcetera.

The target audience here is people who are moving to a new city and require some knowledge about the neighborhoods beforehand so that they can decide the place they want to live in.

# Data

## Wikipedia Scraper

Since available data for Chennai city was sparse online, I've manually scraped the list of neighborhoods from [this](https://en.wikipedia.org/wiki/Areas_of_Chennai) Wikipedia page using `bs4`, and then grabbed all the hyperlinks. Using `urllib`, these links are visited individually and the coordinates and pincodes are scraped and put into a `pandas` dataframe.

```python
url = 'https://en.wikipedia.org/wiki/Areas_of_Chennai'
page_unparsed = urllib.request.urlopen(url)
soup = BeautifulSoup(page_unparsed, 'html.parser')

wiki_rows = [] # each row in the wikipedia table
urls = []
names = []

wiki_table = soup.find_all("table", {"class": "wikitable"})
for row in wiki_table:
  wiki_rows.append(row.find_all('a', href=True))

# gets names and links of each neighborhood so that further scraping can be done
for i in range(len(wiki_rows[0])):
  urls.append('https://en.wikipedia.org' + wiki_rows[0][i]['href'])
  names.append(wiki_rows[0][i].text)
  
# getting data from each neighborhood

latitudes = []
longitudes = []
pincodes = []

for url in tqdm_notebook(urls, total = len(urls), unit = 'url'):
  try: # because some links are broken
    page_unparsed = urllib.request.urlopen(url)
    soup = BeautifulSoup(page_unparsed, 'html.parser')
  except:
    continue

  coords = soup.find("span", {"class" : "geo-dec"})
  pincode = soup.find("div", {"class" : "postal-code"})

  if coords == None:  # because some pages do not have coordinates listed
    latitudes.append(np.nan)
    longitudes.append(np.nan)

  else:
    coords = coords.text.split()
    latitudes.append(float(coords[0].replace('N', '').replace('°', '')))
    longitudes.append(float(coords[1].replace('E', '').replace('°', '')))
```

```python
neighborhoods = pd.DataFrame(list(zip(names, latitudes, longitudes)), columns =['Name', 'Latitude', 'Longitude']) 
neighborhoods = neighborhoods[neighborhoods['Latitude'].notnull()]
neighborhoods = neighborhoods[neighborhoods['Longitude'].notnull()]
neighborhoods.head()
```
This is what my dataframe looks like:

<p align= "center">
|    | Name       |   Latitude |   Longitude |
|---:|:-----------|-----------:|------------:|
|  0 | Adambakkam |    12.99   |     80.2    |
|  1 | Adyar      |    13.0063 |     80.2574 |
|  2 | Alandur    |    13.003  |     80.204  |
|  3 | Alapakkam  |    13.049  |     80.1673 |
|  4 | Alwarpet   |    13.0339 |     80.2486 |
</p>

## Foursquare

The next step is to get all the venues in each neighborhood within a specified radius, in this case, 500 metres. To use Foursquare, we need to create an account as they offer a limited number of API calls per day for a free user (more if you give your credit card details). After signing up, we will get a `CLIENT_ID` and a `CLIENT_SECRET` which are then appended to a URL along with other parameters, which is then used to send a GET request to that URL. The resulting JSON file is then parsed and stored for further use. 

```python
url = 'https://api.foursquare.com/v2/venues/explore?&client_id={}&client_secret={}&v={}&ll={},{}&radius={}&limit={}'.format(
  CLIENT_ID[::-1], 
  CLIENT_SECRET[::-1], 
  VERSION, 
  lat, 
  lng, 
  radius, 
  LIMIT)
            
  # make the GET request
  results = requests.get(url).json()["response"]['groups'][0]['items']
```
After doing this for each neighborhood, the resulting venues are again put into a `pandas` dataframe.

<p align="center">
|    | Neighborhood   |   Neighborhood Latitude |   Neighborhood Longitude | Venue                   | Venue ID                 |   Venue Latitude |   Venue Longitude | Venue Category          |
|---:|:---------------|------------------------:|-------------------------:|:------------------------|:-------------------------|-----------------:|------------------:|:------------------------|
|  0 | Adambakkam     |                 12.99   |                  80.2    | Pizza Republic          | 4bf58dd8d48988d1ca941735 |          12.991  |           80.1986 | Pizza Place             |
|  1 | Adambakkam     |                 12.99   |                  80.2    | Loiee                   | 4bf58dd8d48988d16a941735 |          12.9922 |           80.199  | Bakery                  |
|  2 | Adambakkam     |                 12.99   |                  80.2    | Thalapakattu Hotel      | 4bf58dd8d48988d142941735 |          12.992  |           80.1989 | Asian Restaurant        |
|  3 | Adambakkam     |                 12.99   |                  80.2    | The Great Kabab Factory | 5283c7b4e4b094cb91ec88d7 |          12.9938 |           80.2017 | Kebab Restaurant        |
|  4 | Adyar          |                 13.0063 |                  80.2574 | Bombay Brassiere        | 54135bf5e4b08f3d2429dfdd |          13.007  |           80.2564 | North Indian Restaurant |
</p>

# Methodology

After this, the venue categories are one-hot encoded and then the 10 most frequent venues (only five shown here) in each neighborhood are found using code that I totally did not copy-paste from the tutorial notebooks. The result is this: 

<p align="center">
|    | Neighborhood   | 1st Most Common Venue   | 2nd Most Common Venue   | 3rd Most Common Venue         | 4th Most Common Venue   | 5th Most Common Venue   |
|---:|:---------------|:------------------------|:------------------------|:------------------------------|:------------------------|:------------------------|
|  0 | Adambakkam     | Pizza Place             | Bakery                  | Kebab Restaurant              | Asian Restaurant        | Women's Store           |
|  1 | Adyar          | Indian Restaurant       | North Indian Restaurant | Vegetarian / Vegan Restaurant | Electronics Store       | Juice Bar               |     
|  2 | Alandur        | Hotel                   | Fish Market             | South Indian Restaurant       | Movie Theater           | Donut Shop              |
|  3 | Alapakkam      | Indian Restaurant       | Fast Food Restaurant    | Women's Store                 | Donut Shop              | Flea Market             |
|  4 | Alwarpet       | Indian Restaurant       | Lounge                  | Hotel                         | Japanese Restaurant     | Restaurant              |
</p>

After this, k-means clustering is used to group these neighborhoods. I forgot to choose the best k for this algorithm. I didn't notice until after I published this. Oh well. After they are clustered, we can use Folium (which is a map visualization library for Python), to see all the neighborhoods and the cluster they belong to on a nice map: 

```python
chennai_merged = chennai_merged[chennai_merged['Cluster Labels'].notnull()]

# create map
map_clusters = folium.Map(location=[13.067439, 80.237617], zoom_start=11)

colors = ["#ff0000", "#3d84ad", "#000000", "#ffff00"]

# add markers to the map
markers_colors = []
for lat, lon, poi, cluster in zip(chennai_merged['Latitude'], chennai_merged['Longitude'], chennai_merged['Name'], chennai_merged['Cluster Labels']):
    label = folium.Popup(str(poi) + ' Cluster ' + str(cluster), parse_html=True)
    folium.CircleMarker(
        [lat, lon],
        radius=5,
        popup=label,
        color=colors[int(cluster)],
        fill=True,
        fill_color=colors[int(cluster)],
        fill_opacity=0.7).add_to(map_clusters)
       

map_clusters
```

![folium-chennai](/assets/images/ds-02/folium.png){: .center-image .img-responsive}

Not much can be inferred from this map. Due to the fact that the clusters are grouped together not due to their Euclidean distances on the map, but due to properties of the venues themselves. Inspecting the dataframe which has the cluster labels along with the most frequent venue in each neighborhood, we can see that:

 * Cluster 0 (Red) have Indian Restaurants as their most frequent venue.
![folium-chennai](/assets/images/ds-02/clus0.png){: .center-image .img-responsive}
![folium-chennai](/assets/images/ds-02/clus0_bar.png){: .center-image .img-responsive}

* Cluster 1 (Blue)'s frequent venues are mostly related to food. Evident by counting the occurences of each.
![folium-chennai](/assets/images/ds-02/clus1.png){: .center-image .img-responsive}

* Cluster 2 (Black) has pharmacies as the most frequent venues. 
![folium-chennai](/assets/images/ds-02/clus2.png){: .center-image .img-responsive}

* Cluster 3 (Yellow) has multiple forms of transport as the most frequent venues. 
![folium-chennai](/assets/images/ds-02/clus3.png){: .center-image .img-responsive}

Use these results, we can solve our trivial problem. Nolan should move to neighborhoods in either Cluster 0 or Cluster 1, as they have a high concentration of restaurants and other food-related venues.

# Results

While it looks like we have solved our problem, there is one flaw. Clusters 1 and 2 (Red and Blue) are grouped sporadically, in such a way that Nolan would not have a problem finding food in the majority of the city. Of course, Foursquare data for the city of Chennai is considerably sparse compared to other well developed cities. It also probably does not take into factor the ton of small food shops scattered throughout the city. Using Foursquare, the individual ratings for each venue could also be retrieved, but it did not seem to have rating data for Chennai. This would've helped pick out individual restaurant suggestions and give Nolan a neighborhood with highly rated restaurants. 

# Conclusion

Mr. Nolan would not have trouble finding food in the city of Chennai. For lesser travel times, he can choose any of the neighborhoods in Cluster 0, however he'll find that most of them are Indian restaurants. Independent of travel distance, the cluster choice does not matter much as there are more restaurants than any other venue. There is simply not enough data to do an in-depth analysis. However, individually marking the venues which are food-related is also a possibility- something to do for the future.

The outcome of the project was impacted by the limited effectiveness of the Foursquare API for a city like Chennai. Using some other more developed city would've probably yielded better results. The way the neighborhoods were suggested were majorly due to Indian restaurants alone. 

Further analysis could've been done by using the rating of each venue however yet again ratings were not available for venues in Chennai. If ratings were available, individual restaurants in each locality could've been suggested.

# Final Thoughts

I am in no way entirely happy with the content I posted. It's just too simple. There is so much more that could be done but for now this shall suffice. I will probably get back to this in the future. *Probably.* 

From the stars, 

FR. 


<script src="https://gist.github.com/blazyy/304f020ce812d78501c5ea4fde1f0e25.js"></script>

