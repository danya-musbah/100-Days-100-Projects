# -*- coding: utf-8 -*-
"""
parks_routes.py
مسارات API الخاصة بالمنتزهات، الألعاب، الخدمات، والتذاكر.
هذه بنية أولية (Read-only) تعتمد على بيانات JSON ثابتة، وهي جاهزة
لتوسيعها لاحقًا بعمليات الإضافة والتعديل عند ربط قاعدة بيانات حقيقية.
"""

from flask import Blueprint, jsonify
from services import data_service

parks_bp = Blueprint("parks", __name__, url_prefix="/api")


@parks_bp.route("/parks", methods=["GET"])
def list_parks():
    return jsonify(data_service.get_parks())


@parks_bp.route("/parks/<park_id>", methods=["GET"])
def park_detail(park_id):
    park = data_service.get_park(park_id)
    if not park:
        return jsonify({"error": "المنتزه غير موجود"}), 404
    return jsonify(park)


@parks_bp.route("/parks/<park_id>/rides", methods=["GET"])
def park_rides(park_id):
    return jsonify(data_service.get_rides(park_id))


@parks_bp.route("/parks/<park_id>/services", methods=["GET"])
def park_services(park_id):
    return jsonify(data_service.get_services(park_id))


@parks_bp.route("/parks/<park_id>/tickets", methods=["GET"])
def park_tickets(park_id):
    return jsonify(data_service.get_tickets(park_id))


@parks_bp.route("/bookings", methods=["GET"])
def list_bookings():
    return jsonify(data_service.get_bookings())
