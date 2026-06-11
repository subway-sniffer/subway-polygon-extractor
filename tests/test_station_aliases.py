from route_server.app.station_aliases import station_alias_tokens


def test_chongshin_isu_aliases_share_tokens():
    """총신대입구/이수 표기가 같은 station alias group으로 매칭된다."""
    registered = station_alias_tokens("총신대입구역")
    assert registered & station_alias_tokens("총신대입구")
    assert registered & station_alias_tokens("총신대입구(이수)")
    assert registered & station_alias_tokens("이수")
    assert registered & station_alias_tokens("이수역")

