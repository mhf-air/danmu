(function() {
  "use strict"

  function main() {
    addStyle()
    let danmuPlugin = new DanmuPlugin()
    danmuPlugin.getData()
  }

  function addStyle() {
    if ($('head style[data-id="danmu-plugin"]').length) {
      return
    }

    $("head").append(`
      <style data-id="danmu-plugin">
        #danmu-canvas {
          position: absolute;
          z-index: 100;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }
      </style>
    `)
  }

  class DanmuPlugin {
    constructor() {
      this.data = null
      this.canvas = null
      this.ctx = null
      this.timer = null

      this.biasTime = 0
      this.elapsedTime = 0
      this.canvasWidth = 0
      this.canvasHeight = 0

      this.v = 200
      this.danmuWidth = 30
      this.danmuHeight = 40
    }

    getData() {
      $.ajax({
        url: "http://localhost:9009/",
        success: (resp) => {
          this.processData(resp)
          this.useCanvas()
        },
      })
    }

    processData(resp) {
      let data = JSON.parse(resp)
      data.list.sort(function(a, b) {
        return a.time - b.time
      })

      let player = $("#ykPlayer")
      let playerWidth = player.width()
      let transitionDuration = 13
      data.v = playerWidth * 1.5 / transitionDuration

      for (let i = 0; i < data.list.length; i++) {
        let item = data.list[i]
        if (item.time < 0) {
          item.time = 0
        }
        item.endtime = item.time + item.text.length * 30 / data.v
      }

      data.list[0].top = 0
      let laneList = [{
        time: data.list[0].time,
        endtime: data.list[0].time,
      }]
      for (let i = 1; i < data.list.length; i++) {
        let item = data.list[i]
        let hasNew = true
        for (let j = 0; j < laneList.length; j++) {
          let laneItem = laneList[j]
          if (item.endtime - item.time + laneItem.endtime - laneItem.time > item.endtime - laneItem.time) {
            continue
          } else {
            hasNew = false
            item.top = j
            laneList[j] = item
            break
          }
        }
        if (hasNew) {
          item.top = laneList.length
          laneList.push(item)
        }
      }

      for (let item of data.list) {
        item.time += this.biasTime
      }

      this.data = data
    }

    useCanvas(resp) {
      let player = $("#ykPlayer")
      let box = $(`
        <canvas id="danmu-canvas"></canvas>
      `)
      player.append(box)

      this.canvas = document.getElementById("danmu-canvas")
      this.canvas.width = this.canvas.offsetWidth
      this.canvas.height = this.canvas.offsetHeight
      this.canvasWidth = this.canvas.width
      this.canvasHeight = this.canvas.height

      this.ctx = this.canvas.getContext("2d")

      setTimeout(() => {
        let video = player.find("video")

        video.on("playing", (e) => {
          if (this.timer) {
            this.clearTimer()
          }
          this.play(e.target.currentTime)
        })

        video.on("pause", (e) => {
          this.clearTimer()
        })

      }, 1000)
    }

    clearTimer() {
      cancelAnimationFrame(this.timer)
      this.timer = null
    }

    setDrawConfig() {
      let c = this.ctx
      c.shadowOffsetX = 1
      c.shadowOffsetY = 2
      c.shadowBlur = 2
      c.shadowColor = "rgb(0, 0, 0)"

      c.font = "26px sans-serif"
      c.fillStyle = "#ffffff"
    }

    play(seekTime) {
      this.setDrawConfig()

      this.elapsedTime = 0

      this.timer = requestAnimationFrame((t) => {
        if (!this.elapsedTime) {
          this.elapsedTime = t
        }
        this.draw(seekTime, t)
      })
    }

    draw(seekTime, t) {
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

      let curTime = seekTime + (t - this.elapsedTime) / 1000
      this.elapsedTime = t

      for (let item of this.data.list) {
        let dt = curTime - item.time
        let x = this.canvasWidth - dt * this.v
        let itemWidth = item.text.length * this.danmuWidth
        if (x + itemWidth < 0) {
          continue
        }

        if (item.time > curTime) {
          break
        }

        this.ctx.fillText(item.text, x, (item.top + 1) * this.danmuHeight)
      }

      this.timer = requestAnimationFrame((t) => {
        this.draw(curTime, t)
      })
    }

  }

  main()
})();
