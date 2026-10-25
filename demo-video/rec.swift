// Scripted real-browser recorder: loads live pages in WKWebView, runs JS steps, captures frames.
// usage: rec <script.json> <outdir> [fps]
import AppKit
import WebKit
let args = CommandLine.arguments
let steps = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: args[1]))) as! [[String: Any]]
let outDir = args[2]
let fps = args.count > 3 ? Double(args[3])! : 20
let W = 1440.0, H = 810.0, OUTW = 1920.0
try? FileManager.default.createDirectory(atPath: outDir + "/frames", withIntermediateDirectories: true)
let demoJS = try! String(contentsOfFile: (args[0] as NSString).deletingLastPathComponent + "/demo.js", encoding: .utf8)

class Rec: NSObject, WKNavigationDelegate {
  var web: WKWebView!
  var recording = false, frameN = 0, busy = false
  var t0 = Date()
  var log: [String] = []
  var navDone: (() -> Void)?
  var i = 0
  var lastMark = Date()
  func start() {
    let cfg = WKWebViewConfiguration()
    cfg.websiteDataStore = .nonPersistent()
    cfg.userContentController.addUserScript(WKUserScript(source: demoJS, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
    web = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H), configuration: cfg)
    web.navigationDelegate = self
    let win = NSWindow(contentRect: NSRect(x: -3000, y: 0, width: W, height: H), styleMask: [.borderless], backing: .buffered, defer: false)
    win.contentView = web; win.orderFrontRegardless()
    Timer.scheduledTimer(withTimeInterval: 1 / fps, repeats: true) { _ in self.grab() }
    next()
  }
  func grab() {
    guard recording, !busy else { return }
    busy = true
    let c = WKSnapshotConfiguration(); c.snapshotWidth = NSNumber(value: OUTW)
    let t = Date().timeIntervalSince(t0)
    web.takeSnapshot(with: c) { img, _ in
      self.busy = false
      guard let img = img, let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return }
      let rep = NSBitmapImageRep(cgImage: cg)
      let name = String(format: "f%05d.jpg", self.frameN)
      if let d = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.92]) { try? d.write(to: URL(fileURLWithPath: outDir + "/frames/" + name)) }
      self.log.append("\(name) \(t)"); self.frameN += 1
    }
  }
  var pos = (720.0, 460.0)
  func webView(_ w: WKWebView, didFinish n: WKNavigation!) {
    w.evaluateJavaScript("window.__demo && window.__demo.setPos(\(pos.0), \(pos.1)); 1") { _, _ in }
    navDone?(); navDone = nil
  }
  func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { print("navfail \(e)") }
  func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) { print("provfail \(e)") }
  func after(_ ms: Double, _ f: @escaping () -> Void) { DispatchQueue.main.asyncAfter(deadline: .now() + ms / 1000, execute: f) }
  func finish() {
    recording = false
    after(300) {
      try? self.log.joined(separator: "\n").write(toFile: outDir + "/frames.txt", atomically: true, encoding: .utf8)
      print("done frames=\(self.frameN) t=\(Date().timeIntervalSince(self.t0))"); exit(0)
    }
  }
  func next() {
    guard i < steps.count else { finish(); return }
    let s = steps[i]; i += 1
    if let u = s["goto"] as? String {
      navDone = { self.after((s["settle"] as? Double) ?? 1500) { self.next() } }
      web.load(URLRequest(url: URL(string: u)!))
    } else if let js = s["js"] as? String {
      // Re-inject helpers if a client-side route swap dropped them, then await the step.
      web.callAsyncJavaScript("const D = window.__demo; " + js, arguments: [:], in: nil, in: .page) { r in
        if case .failure(let e) = r { print("step \(self.i - 1) error: \(e)") }
        if case .success(let v) = r, let v = v as? String { print(v) }
        self.web.evaluateJavaScript("window.__demoState ? [window.__demoState.x, window.__demoState.y] : null") { v, _ in
          if let a = v as? [Double], a.count == 2 { self.pos = (a[0], a[1]) }
          self.after((s["wait"] as? Double) ?? 0) { self.next() }
        }
      }
    } else if let h = s["hold"] as? Double {
      after(max(0, h - Date().timeIntervalSince(lastMark) * 1000)) { self.next() }
    } else if let w = s["wait"] as? Double {
      after(w) { self.next() }
    } else if let r = s["rec"] as? Bool {
      if r && log.isEmpty { t0 = Date() }
      recording = r; next()
    } else if let m = s["mark"] as? String {
      lastMark = Date(); let t = Date().timeIntervalSince(t0); log.append("# \(m) \(t)"); print("mark \(m) @\(String(format: "%.2f", t))"); next()
    } else if let p = s["shot"] as? String {
      let c = WKSnapshotConfiguration(); c.snapshotWidth = NSNumber(value: W)
      web.takeSnapshot(with: c) { img, _ in
        if let img = img, let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil), let d = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:]) { try? d.write(to: URL(fileURLWithPath: outDir + "/" + p)) }
        self.next()
      }
    } else { next() }
  }
}
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let rec = Rec()
rec.start()
DispatchQueue.main.asyncAfter(deadline: .now() + 600) { print("timeout"); exit(1) }
app.run()
