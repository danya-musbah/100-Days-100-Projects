# -*- coding: utf-8 -*-
"""
data_service.py
طبقة وصول بسيطة لملفات JSON — تُحاكي طبقة قاعدة البيانات.
عند ربط المشروع بقاعدة بيانات حقيقية (PostgreSQL/Supabase) مستقبلًا،
يكفي استبدال محتوى هذه الدوال بدون تغيير الـ routes التي تستدعيها.
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")


def _load(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_parks():
    return _load("parks.json")


def get_park(park_id):
    return next((p for p in get_parks() if p["id"] == park_id), None)


def get_rides(park_id=None):
    rides = _load("rides.json")
    if park_id:
        return [r for r in rides if r["park_id"] == park_id]
    return rides


def get_services(park_id=None):
    services = _load("services.json")
    if park_id:
        return [s for s in services if s["park_id"] == park_id]
    return services


def get_tickets(park_id=None):
    tickets = _load("tickets.json")
    if park_id:
        return [t for t in tickets if t["park_id"] == park_id]
    return tickets


def get_bookings(park_id=None, user_email=None):
    bookings = _load("bookings.json")
    if park_id:
        bookings = [b for b in bookings if b["park_id"] == park_id]
    if user_email:
        bookings = [b for b in bookings if b["user_email"] == user_email]
    return bookings
