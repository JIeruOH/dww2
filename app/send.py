"""
Server on Flask is pretty slow, so I decided to sent packages by groups
1 thread collects packages based on time
2 thread send collected packages to Flask server
"""
import pandas as pd
import requests
from time import time, sleep
from threading import Thread

data = []
running = True


def main():
    df = pd.read_csv('ip_addresses.csv').sort_values('Timestamp')
    mn = df['Timestamp'].min()

    start = time()

    for ip, lat, lon, tm, sus in df.values:
        sleep(max(0, tm - mn - (time() - start)))
        js = {'ip': ip, 'latitude': lat, 'longitude': lon, 'suspicious': sus, 'time': tm}
        data.append(js)

    global running
    running = False


def send():
    i = 0
    while running or i < len(data):
        j = len(data)
        requests.post("http://server:5000/api", json=data[i:j])
        i = j


Main, Send = Thread(target=main), Thread(target=send)
Main.start(), Send.start()
Main.join(), Send.join()