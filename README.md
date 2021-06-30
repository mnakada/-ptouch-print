# ptouch-print

brotherのラベルプリンターPT-P900/P900W/P950NW/P910BTにネットワーク経由で差し込み印刷するプログラムです。

簡単に差し込み印刷を実現する関係で入力はSVGファイル限定です。
差し込みデータはcsv, json, コマンドの引数で与えることができます。

## 環境
Node.js Ver.14.0.0以降でお使いください。
プリンターのネットワーク検索とステータス取得にmDNSとsnmpを使用しています。
プリンターと同じネットワークにいる端末からご使用ください。

## 使い方

```
　　usage : ptouch-print [options] <svg file>  [<insert file(*.csv|*.json)>] [<key>=<data> ....]
     options:
         --preview   : no print, show preview chrome window
         --fine      : fine pitch print
         --cut       : feed cut enable
         --rotate    : rotate image
```

入力の\<svg file\>は必須です。
\<insert file\>や\<key\>=\<data\>は差し込み印刷しない場合は不要です。

### options
 \-\-preview
    chrome browserで印刷のpreviewを表示します。
    複数の差し込み印刷データを入力されても最初の画面だけの表示になります。

  \-\-fine
     印刷が遅くなる代わりに出力品質が良くなります。用途に応じて指定してください。
     
  \-\-cut
     印刷後に排出します。連続で印刷する場合に指定しなければ、最後の印刷がプリンターから排出されません。プリンターのカットボタンで排出してください。

  \-\-rotate
      出力を90°回転して出力します。
      データの横幅がテープ幅になるようにスケールされます。
      指定しない場合はデータの縦幅がテープ幅になるようにスケールされます。
      
## SVGファイルの作成
最初に固定出力する全体の画像データをSVGで作成します。
テープに全体が収まるようにスケールされるので、その前提でデータを用意してください。

### テキスト差し込み印刷の指定
先頭に＄を付加した差し込み印刷用のkeyのみでテキストブロックを配置してください。他のテキストは別のテキストブロックとして分離してください。keyは大文字／小文字を判別します。
sample.svgファイルを確認してみてください。この中の$id, $nameはそれぞれその前のID:, Name:とは独立したテキストブロックとして存在しています。
 差し込みデータを指定すれば $id は差し込みデータのラベル id に、$name はラベル name  に対応するデータに置き換えられて印刷されます。

### QR Codeの差し込み印刷の指定
１つだけに限定ですが、QR Codeを差し込み印刷することができます。
画像データの中にrgb(255, 0, 0)の赤の正方形を配置してください。
差し込みデータの QRCode というkeyで指定された文字列をエンコードして、その正方形を置き換えます。

### sample data
sample/sample.svgにテキスト差し込み用のid, nameのkeyとQR Code用の赤い正方形を配置したSVGファイルを用意しました。

```
./ptouch-print --preview sample/sample.svg
```
を実行するとchromeでpreviewを見ることができます。

## 差し込み印刷用データの作成

### csvファイル
１行目に各列のkey、２行目以降にデータを配置したcsvファイルを作成します。

#### sample.csv
sample.svg用の差し込みデータのサンプルです。
```
./ptouch-print --preview sample/sample.svg sample/sample.csv
```
１つ目のデータのみchromeでpreviewできます。

### jsonファイル
１件分のkeyとデータのペアのobjectを配列に入れたjsonファイルを作成します。

#### sample.json
sample.csvと同じデータのjson版です。
```
./ptouch-print --preview sample/sample.svg sample/sample.json
```
１つ目のデータのみchromeでpreviewできます。

### 引数での指定
key=dataの形式で指定します。この場合は１件分のデータのみになります。
```
./ptouch-print --preview sample/sample.svg id=10001 name=Alice "QRCode=10001 Alice"
```
chromeでpreviewが出ます。

## 印刷
プリンターの電源を入れて、ネットワークに接続した状態でお使いください。
差し込みデータを指定しない場合は、SVGのデータそのまま１枚だけの出力になります。
差し込みデータを指定した場合は、データの数だけ差し込み印刷します。

## License
[MIT](https://github.com/mnakada/ptouch-print/blob/main/license)


The word "QR Code" is registered trademark of:<br>
DENSO WAVE INCORPORATED
