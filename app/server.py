from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)
history = []


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api', methods=['POST'])
def get_data():
    history.extend(request.json)
    return {'status': 'ok'}


@app.route('/data')
def send_data():
    tm = int(request.args.get('time'))
    l, r = -1, len(history)
    while l + 1 < r:
        m = (l + r) // 2
        if history[m]['time'] < tm:
            l = m
        else:
            r = m
    return jsonify(history[r:])


if __name__ == '__main__':
    print('http://localhost:5000/')
    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)
