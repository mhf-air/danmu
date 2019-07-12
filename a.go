package main

import (
	"compress/flate"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
)

func main() {
	server()
}

func server() {
	fmt.Println("server starting...")
	addr := ":9009"
	http.ListenAndServe(addr, http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		w.Header().Add("Access-Control-Allow-Origin", "*")

		jsonBuf := bili()
		w.Write(jsonBuf)
	}))
}

type D struct {
	P    string `xml:"p,attr"`
	Text string `xml:",chardata"`
}

type Result struct {
	XMLName    xml.Name `xml:"i"`
	ChatServer string   `xml:"chatserver"`
	ChatId     string   `xml:"chatid"`
	Mission    string   `xml:"mission"`
	MaxLimit   string   `xml:"maxlimit"`
	State      string   `xml:"state"`
	RealName   string   `xml:"real_name"`
	Source     string   `xml:"source"`

	Ds []D `xml:"d"`
}

type DanmuModel struct {
	List []Danmu `json:"list"`
}

type Danmu struct {
	Time     float64 `json:"time"`
	Mode     int     `json:"mode"`
	FontSize int     `json:"font_size"`
	Color    string  `json:"color"`
	Text     string  `json:"text"`
}

func bili() []byte {
	urlStr := "https://api.bilibili.com/x/v1/dm/list.so?oid=10948921"

	resp, err := http.Get(urlStr)
	ck(err)
	defer resp.Body.Close()

	reader := flate.NewReader(resp.Body)
	defer reader.Close()

	buf, err := ioutil.ReadAll(reader)
	ck(err)

	// fmt.Println(string(buf[:1000]))

	a := Result{}
	err = xml.Unmarshal(buf, &a)
	ck(err)

	list := make([]Danmu, len(a.Ds))
	for i, item := range a.Ds {
		b := strings.Split(item.P, ",")

		time, err := strconv.ParseFloat(b[0], 64)
		ck(err)

		mode, err := strconv.Atoi(b[1])
		ck(err)

		fontSize, err := strconv.Atoi(b[2])
		ck(err)

		colorValue, err := strconv.Atoi(b[3])
		ck(err)
		color := fmt.Sprintf("%x", colorValue)

		list[i] = Danmu{
			Time:     time,
			Mode:     mode,
			FontSize: fontSize,
			Color:    color,
			Text:     item.Text,
		}
	}

	jsonBuf, err := json.Marshal(DanmuModel{
		List: list,
	})
	ck(err)

	return jsonBuf
}

func ck(err error) {
	if err != nil {
		panic(err)
	}
}
