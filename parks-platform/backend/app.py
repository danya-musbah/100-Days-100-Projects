# -*- coding: utf-8 -*-
"""
app.py — نقطة تشغيل خادم Flask (اختياري)
========================================
هذا الخادم غير مطلوب لتشغيل الواجهة الأمامية في نسختها الحالية،
فالموقع يعمل بالكامل عبر فتح index.html مباشرة في المتصفح باستخدام
بيانات ثابتة (data/*.json) و LocalStorage.

الغرض من هذا الخادم هو تجهيز بنية Backend أولية باستخدام Flask
تحاكي واجهة API حقيقية، بحيث يسهل ربط الواجهة الأمامية بها مستقبلًا
دون الحاجة لإعادة بناء الواجهة، فقط عبر استبدال طبقة storage.js
بطلبات fetch() فعلية إلى هذه المسارات.

للتشغيل:
    pip install flask
    python app.py

ثم يمكن تجربة المسارات على:
    http://127.0.0.1:5000/api/parks
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify
from routes.parks_routes import parks_bp

app = Flask(__name__)
app.register_blueprint(parks_bp)


@app.route("/")
def index():
    return jsonify({
        "message": "مرحبًا بك في Parks Platform API — هذا خادم Flask تجريبي.",
        "note": "الواجهة الأمامية تعمل بشكل مستقل عبر فتح index.html مباشرة ولا تعتمد على هذا الخادم حاليًا.",
        "endpoints": [
            "/api/parks",
            "/api/parks/<park_id>",
            "/api/parks/<park_id>/rides",
            "/api/parks/<park_id>/services",
            "/api/parks/<park_id>/tickets",
            "/api/bookings"
        ]
    })


if __name__ == "__main__":
    app.run(debug=True)
