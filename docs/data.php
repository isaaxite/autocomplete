<?php

	error_reporting(E_ALL^E_NOTICE^E_WARNING);
	define('API_HOST', "http://120.77.92.81:8899/");

	function pre($data){
		echo "<pre>";print_r($data);echo "</pre>";
	}

	/*echo json_encode(array(
		'key'=>$_GET,
		'status'=>'asdasd'
	));exit;*/

	$key = $_GET['key'] ? $_GET['key'] : 1;
	$url = API_HOST."/site/search";
	$params = array(
		'key'=>$key, 'language'=>'en'
	);

	$curl = curl_init();
  curl_setopt($curl, CURLOPT_URL, $url);
  curl_setopt($curl, CURLOPT_HEADER, 1);
  curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
  curl_setopt($curl, CURLOPT_POST, 1);
  curl_setopt($curl, CURLOPT_POSTFIELDS, $params);
  $response = curl_exec($curl);

  $header_size = curl_getinfo($curl, CURLINFO_HEADER_SIZE);
  curl_close($curl);
  $header = substr($response, 0, $header_size);
  $data = substr($response, $header_size);
  echo $data;exit;
  // var_dump($data);
  // pre($data);

  $data = json_decode($data);
  echo json_encode($data->data);


